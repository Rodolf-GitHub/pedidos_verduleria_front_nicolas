// Esta función extrae los valores del enum de se_vende_en_unidad_medida
// del tipo generado por Orval
export const UNIDADES_MEDIDA_VALUES = [
  'kg',
  'unidades',
  'litros',
  'atados',
  'cajas',
  'sacos',
  'bandejas',
  'planchas',
  'otros',
] as const

export type UnidadMedida = (typeof UNIDADES_MEDIDA_VALUES)[number]

export const UNIDADES_MEDIDA_LABELS: Record<UnidadMedida, string> = {
  kg: 'Kilogramos',
  unidades: 'Unidades',
  litros: 'Litros',
  atados: 'Atados',
  cajas: 'Cajas',
  sacos: 'Sacos',
  bandejas: 'Bandejas',
  planchas: 'Planchas',
  otros: 'Otros',
}

export const UNIDADES_MEDIDA = UNIDADES_MEDIDA_VALUES.map((value) => ({
  label: UNIDADES_MEDIDA_LABELS[value],
  value,
}))
