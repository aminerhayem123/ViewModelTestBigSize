import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

const Model = ({ url }) => {
  const obj = useLoader(OBJLoader, url);
  const { camera } = useThree();
  const modelRef = useRef();

  useEffect(() => {
    if (obj) {
      // Fix geometry calculations
      obj.traverse((child) => {
        if (child.isMesh) {
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();

          // Check for and fix NaN values in position attribute
          const positions = child.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i++) {
            if (isNaN(positions[i])) {
              positions[i] = 0;
            }
          }
          child.geometry.attributes.position.needsUpdate = true;
        }
      });

      // Auto-adjust camera to fit model
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));

      camera.position.copy(center);
      camera.position.z += cameraDistance;
      camera.lookAt(center);
    }
  }, [obj, camera]);

  return <primitive ref={modelRef} object={obj} scale={[0.01, 0.01, 0.01]} />;
};

const ModelViewer = ({ url, onError }) => {
  return (
    <div style={{ height: '500px' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: '#f0f0f0' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f0f0f0');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[-10, -10, -10]} />
          
          <Model url={url} />
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1}
            maxDistance={100}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ModelViewer;