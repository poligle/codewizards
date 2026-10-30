{
  description = "CodeWizards development shells";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      tools = pkgs: [
        pkgs.nodejs_22 # node and npm: the core, its tests and the smoke test
        (pkgs.python3.withPackages (ps: [ ps.numpy ps.pillow ps.fonttools ])) # the art generator and the evals
        pkgs.git
      ];
      # `codewizards` on the PATH inside the shell (run `npm ci --ignore-scripts` once for its ws).
      # The script is codewizards.js: a link named codewizards in a fresh folder puts it on the PATH
      # under its real name, and keeps working after a cd.
      onPath = ''
        cw_bin="$(mktemp -d)"
        ln -s "$PWD/apps/core/bin/codewizards.js" "$cw_bin/codewizards"
        export PATH="$cw_bin:$PATH"
      '';
    in
    {
      devShells = forAllSystems (pkgs:
        {
          # nix develop
          default = pkgs.mkShell { packages = tools pkgs; shellHook = onPath; };
        }
        // nixpkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
          # nix develop .#smoke — Playwright's own Chromium does not run on NixOS, so the smoke
          # test drives nixpkgs' Chromium instead (tools/smoke.mjs reads CW_CHROMIUM).
          smoke = pkgs.mkShell {
            packages = tools pkgs ++ [ pkgs.chromium ];
            CW_CHROMIUM = "${pkgs.chromium}/bin/chromium";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
            shellHook = onPath;
          };
        });
    };
}
