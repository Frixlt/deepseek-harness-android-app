#!/usr/bin/env python3
"""Prepare a private model package. Author-owned models/SDKs never enter the repository."""
import argparse
import json
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-dir', type=Path, help='Directory containing the three licensed JS runtime files')
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    player = Path(__file__).resolve().parent.parent / 'android-app' / 'overlay-player'
    scripts = ('live2dcubismcore.min.js', 'pixi.min.js', 'cubism4.min.js')
    runtime = args.runtime_dir or output
    for name in scripts:
        if not (runtime / name).is_file():
            parser.error(f'Missing runtime {runtime / name}; provide --runtime-dir with your existing SDK files')
    existing = list((output / 'model').glob('*.model3.json'))
    if not existing:
        if not args.archive or not args.archive.is_file():
            parser.error('No installed model; provide --archive with the original model ZIP')
        # Extract only files referenced by model3.json, never PSDs, previews or VTube settings.
        with tempfile.TemporaryDirectory(prefix='avatar-model-') as tmp, zipfile.ZipFile(args.archive) as archive:
            model_files = [n for n in archive.namelist() if n.endswith('.model3.json')]
            if len(model_files) != 1:
                parser.error(f'Expected one model3.json, found {len(model_files)}')
            entry = PurePosixPath(model_files[0])
            model = json.loads(archive.read(str(entry)))
            refs = model['FileReferences']
            required = [entry.name, refs['Moc'], refs['Physics'], refs['DisplayInfo'], *refs['Textures']]
            stage = Path(tmp) / 'model'
            for relative in required:
                rel = PurePosixPath(relative)
                if rel.is_absolute() or '..' in rel.parts:
                    parser.error(f'Unsafe model reference: {relative}')
                dest = stage.joinpath(*rel.parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(archive.read(str(entry.parent / rel)))
            # Preserve UVs and transparency; bound GPU texture memory for a mobile overlay.
            from PIL import Image
            for relative in refs['Textures']:
                path = stage / relative
                with Image.open(path) as im:
                    im.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                    im.save(path, optimize=True)
            output.mkdir(parents=True, exist_ok=True)
            shutil.copytree(stage, output / 'model', dirs_exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    for name in scripts:
        if (runtime / name).resolve() != (output / name).resolve():
            shutil.copy2(runtime / name, output / name)
    for source in player.iterdir():
        if source.suffix in ('.html', '.js'):
            shutil.copy2(source, output / source.name)
    manifest = next((output / 'model').glob('*.model3.json'))
    refs = json.loads(manifest.read_text())['FileReferences']
    for relative in [refs['Moc'], refs['Physics'], refs['DisplayInfo'], *refs['Textures']]:
        if not (manifest.parent / relative).is_file():
            parser.error(f'Incomplete model package: {relative}')
    print(f'Avatar package ready: {output}')


if __name__ == '__main__':
    main()
