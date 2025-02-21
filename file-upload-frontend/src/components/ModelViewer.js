import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls, Environment } from '@react-three/drei';

const Model = ({ url }) => {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} scale={[0.01, 0.01, 0.01]} />;
};

const ModelViewer = ({ url, onError }) => {
  return (
    <div style={{ height: '500px' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: '#f0f0f0' }}
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
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ModelViewer;