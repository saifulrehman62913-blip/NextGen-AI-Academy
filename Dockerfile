FROM node:24-bookworm-slim AS assets
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY shared ./shared
COPY web ./web
RUN python3 scripts/build_curriculum.py && python3 scripts/package_preview.py

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=assets --chown=node:node /app/shared ./shared
COPY --from=assets --chown=node:node /app/web ./web
COPY --chown=node:node server ./server
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/config').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/server.mjs"]
