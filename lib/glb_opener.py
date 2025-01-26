import sys
from pygltflib import GLTF2

def load_and_print_glb(filename):
    try:
        # Load the GLB file
        gltf = GLTF2().load(filename)

        # Print basic information
        print(f"✅ Loaded GLB file: {filename}")
        print(f"📌 Number of meshes: {len(gltf.meshes)}")
        print(f"📌 Number of nodes: {len(gltf.nodes)}")
        print(f"📌 Number of scenes: {len(gltf.scenes)}")
        print(f"📌 Number of materials: {len(gltf.materials)}")
        print(f"📌 Number of textures: {len(gltf.textures)}")
        print(f"📌 Number of images: {len(gltf.images)}")
        print(f"📌 Number of accessors: {len(gltf.accessors)}")
        print(f"📌 Number of bufferViews: {len(gltf.bufferViews)}")
        print(f"📌 Number of buffers: {len(gltf.buffers)}")
        print(f"📌 Number of animations: {len(gltf.animations)}")

        # Print details about each mesh
        for i, mesh in enumerate(gltf.meshes):
            print(f"\n🔹 Mesh {i}:")
            for j, primitive in enumerate(mesh.primitives):
                print(f"  - Primitive {j}:")
                print(f"    - Attributes: {primitive.attributes}")
                print(f"    - Indices: {primitive.indices}")
                print(f"    - Material index: {primitive.material}")

        # Print details about each node
        for i, node in enumerate(gltf.nodes):
            print(f"\n📍 Node {i}:")
            print(f"  - Mesh index: {node.mesh}")
            print(f"  - Translation: {node.translation}")
            print(f"  - Rotation: {node.rotation}")
            print(f"  - Scale: {node.scale}")
            print(f"  - Children: {node.children}")

        # Print materials info
        for i, material in enumerate(gltf.materials):
            print(f"\n🎨 Material {i}:")
            print(f"  - Base Color Texture Index: {getattr(material.pbrMetallicRoughness, 'baseColorTexture', None)}")
            print(f"  - Metallic Factor: {getattr(material.pbrMetallicRoughness, 'metallicFactor', None)}")
            print(f"  - Roughness Factor: {getattr(material.pbrMetallicRoughness, 'roughnessFactor', None)}")

        # Print textures info
        for i, texture in enumerate(gltf.textures):
            print(f"\n🖼️ Texture {i}:")
            print(f"  - Image index: {texture.source}")
            print(f"  - Sampler index: {texture.sampler}")

        # Print image info
        for i, image in enumerate(gltf.images):
            print(f"\n📷 Image {i}:")
            print(f"  - URI: {image.uri}")
            print(f"  - BufferView index: {image.bufferView}")

        # Print accessors info
        for i, accessor in enumerate(gltf.accessors):
            print(f"\n📊 Accessor {i}:")
            print(f"  - BufferView index: {accessor.bufferView}")
            print(f"  - Component Type: {accessor.componentType}")
            print(f"  - Count: {accessor.count}")
            print(f"  - Type: {accessor.type}")

        # Print buffer views info
        for i, bufferview in enumerate(gltf.bufferViews):
            print(f"\n💾 BufferView {i}:")
            print(f"  - Buffer index: {bufferview.buffer}")
            print(f"  - Byte Offset: {bufferview.byteOffset}")
            print(f"  - Byte Length: {bufferview.byteLength}")

        # Print animations info
        for i, animation in enumerate(gltf.animations):
            print(f"\n🎬 Animation {i}:")
            print(f"  - Number of channels: {len(animation.channels)}")
            print(f"  - Number of samplers: {len(animation.samplers)}")

    except Exception as e:
        print(f"❌ Error loading GLB file: {str(e)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python load_glb.py <path_to_glb_file>")
        sys.exit(1)

    glb_file_path = sys.argv[1]
    load_and_print_glb(glb_file_path)
