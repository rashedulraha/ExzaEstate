# ==============================================================================
# ExzaEstate Web SPA Production Nginx Container
# References: architecture.md §12.7, §17; security.md §15, §16
# ==============================================================================
FROM nginx:1.27-alpine

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy Nginx deployment configs
COPY apps/web/deploy/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY apps/web/deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from dist
COPY apps/web/dist /usr/share/nginx/html

# Grant non-root nginx user proper permissions
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
