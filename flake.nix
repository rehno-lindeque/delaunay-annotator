{
  description = "Some web components for segmentations";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
  };

  outputs = {
    self,
    nixpkgs,
    ...
  } @ inputs: let
    inherit (nixpkgs) lib;

    supportedSystems = lib.platforms.all;
    developerSystems = ["x86_64-linux" "aarch64-linux"];

    legacyPackages = lib.genAttrs supportedSystems (system: import nixpkgs {inherit system;});
  in {
    checks = self.packages;

    formatter = lib.genAttrs developerSystems (system: legacyPackages.${system}.alejandra);

    packages = lib.genAttrs supportedSystems (
      system: {
        default = self.packages.${system}.dist;

        dist = legacyPackages.${system}.stdenvNoCC.mkDerivation {
          pname = "segmentation-components-dist";
          version = "1.0.0";

          src = lib.fileset.toSource {
            root = ./.;
            fileset = lib.fileset.fileFilter (file: file.hasExt "html" || file.hasExt "js") ./.;
          };

          installPhase = ''
            mkdir -p $out
            cp -r * $out/
          '';

          meta = with lib; {
            description = "Segmentation annotation tool as a web component";
            license = licenses.mit;
            platforms = platforms.all;
          };
        };
      }
    );

    devShells = lib.genAttrs developerSystems (system: {
      default = legacyPackages.${system}.mkShell {
        buildInputs = [
          legacyPackages.${system}.devenv
          legacyPackages.${system}.nodePackages.prettier
        ];
      };
    });
  };
}
