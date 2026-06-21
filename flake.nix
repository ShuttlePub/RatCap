{
  description = "A basic flake with a shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.systems.url = "github:nix-systems/default";
  inputs.flake-utils = {
    url = "github:numtide/flake-utils";
    inputs.systems.follows = "systems";
  };
  inputs.purescript-overlay = {
    url = "github:thomashoneyman/purescript-overlay";
    inputs.nixpkgs.follows = "nixpkgs";
  };
  inputs.treefmt-nix = {
    url = "github:numtide/treefmt-nix";
    inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    { nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ inputs.purescript-overlay.overlays.default ];
        };
        treefmtEval = inputs.treefmt-nix.lib.evalModule pkgs {
          projectRootFile = "flake.nix";
          programs.nixfmt.enable = true;
          settings.formatter.purs-tidy = {
            command = "${pkgs.purs-tidy}/bin/purs-tidy";
            options = [ "format-in-place" ];
            includes = [ "*.purs" ];
          };
        };
      in
      {
        formatter = treefmtEval.config.build.wrapper;
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bashInteractive
            purs
            spago
            purs-backend-es
            purescript-language-server
            purs-tidy
            esbuild
            watchexec
            openssl
            pinact
            zizmor
          ];
        };
      }
    );
}
