FROM node:20-alpine AS deps
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev         

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5001                 
COPY --from=deps /app/node_modules ./node_modules
COPY api .                    
EXPOSE 5001
CMD ["node", "server.js"]