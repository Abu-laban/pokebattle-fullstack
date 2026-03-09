import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function Pokemon3D({ pokemonId, name, size = 200, autoRotate = true, className = '' }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Load 3D model
    const loader = new GLTFLoader();

    // Try to load from a 3D model repository
    // Example: https://raw.githubusercontent.com/Pokemon-3D-Models/Pokemon-3D-Models/main/models/{pokemonId}.glb
    // You can find free 3D Pokémon models on GitHub or Sketchfab
    const modelUrls = [
      `https://raw.githubusercontent.com/Pokemon-3D-Models/Pokemon-3D-Models/main/models/${pokemonId}.glb`, // Replace with actual repo URL
      // Add more fallback URLs here
    ];

    let modelLoaded = false;

    const loadModel = (url) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(1, 1, 1);
          model.position.set(0, 0, 0);
          scene.add(model);
          modelRef.current = model;
          modelLoaded = true;
        },
        undefined,
        (error) => {
          console.warn(`Failed to load 3D model for ${name}:`, error);
          // Create a fallback 3D object (cube with texture)
          createFallbackModel();
        }
      );
    };

    const createFallbackModel = () => {
      // Create a simple 3D cube as fallback
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      modelRef.current = cube;
    };

    // For now, create fallback since we don't have actual model URLs
    createFallbackModel();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (modelRef.current && autoRotate) {
        modelRef.current.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      renderer.setSize(size, size);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [pokemonId, name, size, autoRotate]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block'
      }}
      title={`${name} (3D)`}
    />
  );
}