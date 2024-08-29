{...}: {
  services.caddy = {
    enable = true;
    config = ''
      (cors) {
        @cors_preflight method OPTIONS

        header {
          Access-Control-Allow-Origin "{header.origin}"
          Vary Origin
          Access-Control-Expose-Headers "Authorization"
          Access-Control-Allow-Credentials "true"
        }

        handle @cors_preflight {
          header {
            Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE"
            Access-Control-Max-Age "3600"
          }
          respond "" 204
        }
      }'';

    virtualHosts.":6006" = {
      # extraConfig = ''respond "Hello, world!"'';
      extraConfig = ''
        import cors {header.origin}
        root * src
        file_server
        handle_path /api/* {
          reverse_proxy https://gpu-server.tiger-jazz.ts.net:4443 {
            header_up Host {upstream_hostport}
          }
        }
      '';
    };
  };
}
