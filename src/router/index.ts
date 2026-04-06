import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/apps/usuarios/pages/LoginPage.vue'
import UsuariosPage from '@/apps/usuarios/pages/UsuariosPage.vue'
import PedidosPage from '@/apps/pedidos/pages/PedidosPage.vue'
import PedidosDiariosPage from '@/apps/pedidos_diarios/pages/PedidosDiariosPage.vue'
import PedidoDiarioPedidoPage from '@/apps/pedidos_diarios/pages/PedidoDiarioPedidoPage.vue'
import PedidoDetallesPage from '@/apps/pedidos/pages/PedidoDetallesPage.vue'
import ProductosPage from '@/apps/productos/pages/ProductosPage.vue'
import NegociosPage from '@/apps/negocios/pages/NegociosPage.vue'
import ComprasPage from '@/apps/compras/pages/ComprasPage.vue'
import CompraDetallesPage from '@/apps/compras/pages/CompraDetallesPage.vue'
import AyudaPage from '@/apps/ayuda/pages/AyudaPage.vue'
import GuiaAdminPage from '@/apps/ayuda/pages/GuiaAdminPage.vue'
import GuiaVerduleroPage from '@/apps/ayuda/pages/GuiaVerduleroPage.vue'
import GuiaCompradorPage from '@/apps/ayuda/pages/GuiaCompradorPage.vue'
import AccesoBloqueadoPage from '@/apps/usuarios/pages/AccesoBloqueadoPage.vue'
import { HOSTING_BLOQUEADO } from '@/config/env'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/acceso-bloqueado',
      name: 'acceso-bloqueado',
      component: AccesoBloqueadoPage,
    },
    {
      path: '/app',
      component: AppLayout,
      children: [
        {
          path: '/usuarios',
          name: 'usuarios',
          component: UsuariosPage,
        },
        {
          path: '/pedidos',
          name: 'pedidos',
          component: PedidosPage,
        },
        {
          path: '/pedidos-diarios',
          name: 'pedidos-diarios',
          component: PedidosDiariosPage,
        },
        {
          path: '/pedidos-diarios/pedido/:pedidoId',
          name: 'pedido-diario-por-pedido',
          component: PedidoDiarioPedidoPage,
        },
        {
          path: '/pedidos/:id',
          name: 'pedido-detalles',
          component: PedidoDetallesPage,
        },
        {
          path: '/productos',
          name: 'productos',
          component: ProductosPage,
        },
        {
          path: '/negocios',
          name: 'negocios',
          component: NegociosPage,
        },
        {
          path: '/compras',
          name: 'compras',
          component: ComprasPage,
        },
        {
          path: '/compras/:id',
          name: 'compra-detalles',
          component: CompraDetallesPage,
        },
        {
          path: '/ayuda',
          name: 'ayuda',
          component: AyudaPage,
        },
        {
          path: '/ayuda/admin',
          name: 'guia-admin',
          component: GuiaAdminPage,
        },
        {
          path: '/ayuda/verdulero',
          name: 'guia-verdulero',
          component: GuiaVerduleroPage,
        },
        {
          path: '/ayuda/comprador',
          name: 'guia-comprador',
          component: GuiaCompradorPage,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')
  if (HOSTING_BLOQUEADO && to.name !== 'login' && to.name !== 'acceso-bloqueado' && token) {
    return { name: 'acceso-bloqueado' }
  }
})

export default router
