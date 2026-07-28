{
  description = "A basic flake with a shell";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
    purescript-overlay = {
      url = "github:thomashoneyman/purescript-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    intent-system-flake.url = "github:turtton/intent-system-flake";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      intent-system-flake,
      ...
    }@inputs:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ inputs.purescript-overlay.overlays.default ];
        };
        intent-system = intent-system-flake.packages."${system}".intent-cli;
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
            intent-system
          ];
        };
      }
    );
}
