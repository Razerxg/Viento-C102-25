// TIPOLOGÍAS DE CUBIERTA — Figura 2.4-1 del CIRSOC 102-2025.
//
// La figura NO trata todas las cubiertas igual, y la diferencia no es de dibujo sino de
// qué superficie recibe qué coeficiente:
//
//   · A DOS Y A CUATRO AGUAS — el viento normal a la cumbrera parte la cubierta en un
//     faldón a barlovento y otro a sotavento, cada uno con su Cp.
//
//   · DE VERTIENTE ÚNICA (nota 4) — «la superficie completa de la misma es superficie a
//     barlovento o a sotavento». NO se parte: toda la cubierta toma UN coeficiente, y
//     cuál depende de hacia dónde cae la pendiente respecto del viento.
//
//   · EN MANSARDA (nota 6) — «la superficie superior horizontal y la superficie inclinada
//     a sotavento se consideran en la tabla como superficies a sotavento».
//
// Tratarlas todas como dos aguas —que es lo que hacía la primera versión— da coeficientes
// equivocados en un galpón a un agua, que es de los casos más comunes. Y el error no se
// nota: el resultado sigue siendo un número plausible.
export const TIPOS_CUBIERTA = [
  { id: "plana", label: "Plana", anguloFijo: 0,
    ayuda: "θ = 0. Se zonifica en franjas desde el borde de barlovento, en toda dirección." },
  { id: "vertiente_unica", label: "De vertiente única (un agua)", pideDireccion: true,
    ayuda: "Nota 4: con el viento normal a la cumbrera, TODA la superficie es barlovento o "
      + "sotavento según hacia dónde cae la pendiente. No se parte en dos faldones." },
  { id: "dos_aguas", label: "A dos aguas", ayuda:
    "Con el viento normal a la cumbrera se parte en faldón a barlovento y faldón a sotavento." },
  { id: "cuatro_aguas", label: "A cuatro aguas", ayuda:
    "Mismo tratamiento que dos aguas en la tabla de Cp: la figura las agrupa." },
  // Se declara pero NO se calcula: la mansarda necesita la altura de la superficie
  // horizontal superior, que es un dato más, y la nota 6 cambia qué cae en cada columna.
  // Ofrecerla tratándola como dos aguas sería dar un número equivocado sin avisar.
  { id: "mansarda", label: "En mansarda", noImplementada: true, ayuda:
    "Nota 6: la superficie horizontal superior y la inclinada a sotavento se consideran "
      + "sotavento. Todavía no implementada — requiere declarar la altura de la superficie "
      + "horizontal." },
];

export const tipoDe = (id) => TIPOS_CUBIERTA.find(t => t.id === id) ?? TIPOS_CUBIERTA[0];

// Hacia dónde DESCIENDE la pendiente, para vertiente única. La normal de la superficie
// tiene su componente horizontal en esa misma dirección, y de ahí sale si la cara mira al
// viento o le da la espalda.
export const DIRECCIONES_PENDIENTE = [
  { id: "+X", label: "Desciende hacia +X", eje: "X", signo: +1 },
  { id: "-X", label: "Desciende hacia −X", eje: "X", signo: -1 },
  { id: "+Y", label: "Desciende hacia +Y", eje: "Y", signo: +1 },
  { id: "-Y", label: "Desciende hacia −Y", eje: "Y", signo: -1 },
];
