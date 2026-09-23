import { readFile, writeFile } from 'node:fs/promises';

const platforms = ['darwin_arm64', 'darwin_amd64', 'linux_arm64', 'linux_amd64'] as const;

export function renderHomebrewFormula(tag: string, checksums: string): string {
 if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?$/.test(tag)) throw new Error(`Invalid release tag: ${tag}`);
 const version = tag.slice(1);
 const hashes = new Map<string, string>();
 for (const line of checksums.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const match = /^([a-fA-F0-9]{64})\s+\*?([^\s]+)$/.exec(line);
  if (!match) throw new Error(`Invalid checksum line: ${line}`);
  if (hashes.has(match[2])) throw new Error(`Duplicate checksum for ${match[2]}`);
  hashes.set(match[2], match[1].toLowerCase());
 }
 const archive = (platform: typeof platforms[number]) => {
  const name = `kuit_${version}_${platform}.tar.gz`;
  const hash = hashes.get(name);
  if (!hash) throw new Error(`Missing checksum for ${name}`);
  return `      url "https://github.com/8ftdev/kuit/releases/download/${tag}/${name}"\n      sha256 "${hash}"`;
 };
 return `class Kuit < Formula
  desc "Local collection of web components and development tools"
  homepage "https://github.com/8ftdev/kuit"

  on_macos do
    on_arm do
${archive('darwin_arm64')}
    end

    on_intel do
${archive('darwin_amd64')}
    end
  end

  on_linux do
    on_arm do
${archive('linux_arm64')}
    end

    on_intel do
${archive('linux_amd64')}
    end
  end

  def install
    bin.install "kuit"
  end

  test do
    assert_match "kuit", shell_output("#{bin}/kuit --help")
  end
end
`;
}

if (import.meta.main) {
 const [tag, checksumsPath, outputPath] = process.argv.slice(2);
 if (!tag || !checksumsPath || !outputPath) throw new Error('Usage: bun scripts/homebrew-formula.ts <tag> <checksums.txt> <Formula/kuit.rb>');
 await writeFile(outputPath, renderHomebrewFormula(tag, await readFile(checksumsPath, 'utf8')));
}
