// collision-mesh-generator.js - GLB/FBX 모델에서 자동 충돌체 생성

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class CollisionMeshGenerator {
    constructor(world) {
        this.world = world;
    }

    /**
     * GLB/FBX 모델에서 자동으로 충돌체 생성
     * @param {THREE.Group} model - 로드된 3D 모델
     * @param {Object} options - 옵션 설정
     */
    generateCollisionFromModel(model, options = {}) {
        const {
            material = new CANNON.Material('ground'),
            mass = 0, // 0 = 정적 충돌체
            collisionType = 'trimesh', // 'trimesh', 'convex', 'box'
            scale = { x: 1, y: 1, z: 1 },
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0 }
        } = options;

        const collisionBodies = [];

        // 모델의 모든 메쉬를 순회하며 충돌체 생성
        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                let collisionBody;

                switch (collisionType) {
                    case 'trimesh':
                        collisionBody = this.createTrimeshCollision(child, material, mass);
                        break;
                    case 'convex':
                        collisionBody = this.createConvexCollision(child, material, mass);
                        break;
                    case 'box':
                        collisionBody = this.createBoxCollision(child, material, mass);
                        break;
                    default:
                        collisionBody = this.createTrimeshCollision(child, material, mass);
                }

                if (collisionBody) {
                    // 스케일 적용
                    collisionBody.position.set(
                        position.x + child.position.x * scale.x,
                        position.y + child.position.y * scale.y,
                        position.z + child.position.z * scale.z
                    );

                    // 회전 적용
                    collisionBody.quaternion.setFromAxisAngle(
                        new CANNON.Vec3(1, 0, 0), rotation.x
                    );
                    collisionBody.quaternion = collisionBody.quaternion.mult(
                        new CANNON.Quaternion().setFromAxisAngle(
                            new CANNON.Vec3(0, 1, 0), rotation.y
                        )
                    );
                    collisionBody.quaternion = collisionBody.quaternion.mult(
                        new CANNON.Quaternion().setFromAxisAngle(
                            new CANNON.Vec3(0, 0, 1), rotation.z
                        )
                    );

                    this.world.addBody(collisionBody);
                    collisionBodies.push(collisionBody);
                }
            }
        });

        return collisionBodies;
    }

    /**
     * Trimesh 충돌체 생성 (가장 정확하지만 성능 부담)
     * 성능 최적화를 위해 버텍스 수를 제한
     */
    createTrimeshCollision(mesh, material, mass) {
        const geometry = mesh.geometry.clone();
        
        // 성능을 위해 복잡한 지오메트리 단순화
        const vertexCount = geometry.attributes.position.count;
        console.log(`원본 버텍스 수: ${vertexCount}`);
        
        // 버텍스가 너무 많으면 경고하고 Box 충돌체로 대체
        if (vertexCount > 1000) {
            console.warn(`⚠️ 버텍스 수가 너무 많습니다 (${vertexCount}). Box 충돌체로 대체합니다.`);
            return this.createBoxCollision(mesh, material, mass);
        }
        
        // 지오메트리 준비
        if (!geometry.index) {
            geometry.computeBoundingBox();
        }

        const vertices = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;

        // Cannon.js용 버텍스 배열 생성
        const cannonVertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            cannonVertices.push(new CANNON.Vec3(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2]
            ));
        }

        // 인덱스 배열 생성
        const cannonFaces = [];
        if (indices) {
            for (let i = 0; i < indices.length; i += 3) {
                cannonFaces.push([indices[i], indices[i + 1], indices[i + 2]]);
            }
        } else {
            // 인덱스가 없는 경우 순차적으로 생성
            for (let i = 0; i < cannonVertices.length; i += 3) {
                cannonFaces.push([i, i + 1, i + 2]);
            }
        }

        try {
            const trimeshShape = new CANNON.Trimesh(cannonVertices, cannonFaces);
            const body = new CANNON.Body({ mass, material });
            body.addShape(trimeshShape);
            console.log(`✅ Trimesh 충돌체 생성 완료 (${cannonVertices.length} 버텍스)`);
            return body;
        } catch (error) {
            console.error('Trimesh 생성 실패, Box로 대체:', error);
            return this.createBoxCollision(mesh, material, mass);
        }
    }

    /**
     * Convex Hull 충돌체 생성 (적당한 정확도와 성능)
     */
    createConvexCollision(mesh, material, mass) {
        const geometry = mesh.geometry;
        const vertices = geometry.attributes.position.array;

        const cannonVertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            cannonVertices.push(new CANNON.Vec3(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2]
            ));
        }

        const convexShape = new CANNON.ConvexPolyhedron({
            vertices: cannonVertices,
            faces: [] // Cannon.js가 자동으로 계산
        });

        const body = new CANNON.Body({ mass, material });
        body.addShape(convexShape);

        return body;
    }

    /**
     * 바운딩 박스 충돌체 생성 (가장 빠르지만 부정확)
     */
    createBoxCollision(mesh, material, mass) {
        const geometry = mesh.geometry;
        geometry.computeBoundingBox();
        
        const box = geometry.boundingBox;
        const size = new CANNON.Vec3(
            (box.max.x - box.min.x) / 2,
            (box.max.y - box.min.y) / 2,
            (box.max.z - box.min.z) / 2
        );

        const boxShape = new CANNON.Box(size);
        const body = new CANNON.Body({ mass, material });
        body.addShape(boxShape);

        // 바운딩 박스 중심으로 위치 조정
        const center = new CANNON.Vec3(
            (box.max.x + box.min.x) / 2,
            (box.max.y + box.min.y) / 2,
            (box.max.z + box.min.z) / 2
        );
        body.position.copy(center);

        return body;
    }
}

// 사용 예시 함수들
export const CollisionUtils = {
    /**
     * 레이싱 트랙용 충돌체 생성
     */
    createTrackCollision(model, world) {
        const generator = new CollisionMeshGenerator(world);
        return generator.generateCollisionFromModel(model, {
            collisionType: 'trimesh', // 정확한 충돌 감지 필요
            material: new CANNON.Material('track'),
            mass: 0 // 정적
        });
    },

    /**
     * 건물/장애물용 충돌체 생성
     */
    createBuildingCollision(model, world) {
        const generator = new CollisionMeshGenerator(world);
        return generator.generateCollisionFromModel(model, {
            collisionType: 'box', // 성능 우선
            material: new CANNON.Material('building'),
            mass: 0 // 정적
        });
    },

    /**
     * 동적 오브젝트용 충돌체 생성
     */
    createDynamicCollision(model, world, mass = 1) {
        const generator = new CollisionMeshGenerator(world);
        return generator.generateCollisionFromModel(model, {
            collisionType: 'convex', // 균형잡힌 선택
            material: new CANNON.Material('dynamic'),
            mass: mass // 동적
        });
    }
};