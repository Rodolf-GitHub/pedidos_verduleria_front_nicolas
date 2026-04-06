import { defineConfig } from 'orval'

export default defineConfig({
  usuarios: {
    input: './src/openapi/usuarios.json',
    output: {
      target: './src/apps/usuarios/api/index.ts',
      schemas: './src/apps/usuarios/api/schemas',
      client: 'fetch',
    },
  },
  productos: {
    input: './src/openapi/productos.json',
    output: {
      target: './src/apps/productos/api/index.ts',
      schemas: './src/apps/productos/api/schemas',
      client: 'fetch',
    },
  },
  pedidos: {
    input: './src/openapi/pedidos.json',
    output: {
      target: './src/apps/pedidos/api/index.ts',
      schemas: './src/apps/pedidos/api/schemas',
      client: 'fetch',
    },
  },
  negocios: {
    input: './src/openapi/negocios.json',
    output: {
      target: './src/apps/negocios/api/index.ts',
      schemas: './src/apps/negocios/api/schemas',
      client: 'fetch',
    },
  },
  compras: {
    input: './src/openapi/compras.json',
    output: {
      target: './src/apps/compras/api/index.ts',
      schemas: './src/apps/compras/api/schemas',
      client: 'fetch',
    },
  },
  pedidos_diarios: {
    input: './src/openapi/pedidos_diarios.json',
    output: {
      target: './src/apps/pedidos_diarios/api/index.ts',
      schemas: './src/apps/pedidos_diarios/api/schemas',
      client: 'fetch',
    },
  },
})
