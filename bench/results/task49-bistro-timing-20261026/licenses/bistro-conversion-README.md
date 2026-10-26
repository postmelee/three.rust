# Amazon Lumberyard Bistro — glTF + KTX2 Conversion

This is a **derivative work** of the [Amazon Lumberyard Bistro](http://developer.nvidia.com/orca/amazon-lumberyard-bistro) scene from the Open Research Content Archive (ORCA).

The original FBX assets (v5.2) have been converted to **glTF 2.0** format with **KTX2** compressed textures for broader compatibility with modern real-time renderers and web-based applications.

## Changes from the Original

- Converted scene files from FBX to glTF 2.0 (`.gltf` + `.bin`)
- Converted textures from DDS to KTX2 format
- HDR environment map retained in original format

## Scenes

| Scene | Description | Triangles (unique) |
|---|---|---|
| BistroExterior | Exterior scene | 2,799,704 |
| BistroInterior | Interior scene | 1,044,183 |
| BistroInterior_Wine | Interior with filled wine glasses | 935,853 |

## Texture Convention

Textures use a GGX-based metal-rough PBR material system:

- **BaseColor**: RGB = Base Color, Alpha = Opacity
- **Specular**: R = Occlusion, G = Roughness, B = Metalness
- **Normal**: DirectX normal map
- **Emissive**: RGB = Emissive color

## Environment Map

HDR environment map (`san_giuseppe_bridge_4k.hdr`) for exterior from [HDRIHaven](https://hdrihaven.com).

## License

This asset is licensed under the [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

See [LICENSE.txt](LICENSE.txt) for the full license text.

## Attribution

```bibtex
@misc{ORCAAmazonBistro,
  title = {Amazon Lumberyard Bistro, Open Research Content Archive (ORCA)},
  author = {Amazon Lumberyard},
  year = {2017},
  month = {July},
  note = {\small \texttt{http://developer.nvidia.com/orca/amazon-lumberyard-bistro}},
  url = {http://developer.nvidia.com/orca/amazon-lumberyard-bistro}
}
```
