// CAPÍTULO 5 — QUÉ FIGURA, CON QUÉ ALTURA, Y EL ÁREA EFECTIVA DEL ELEMENTO.
//
// Un (GC_p) bien leído de la figura equivocada da una presión plausible y un cálculo
// entero mal, y ningún control posterior lo detecta: el número sale del orden esperado.
// Por eso la selección se verifica en los BORDES de cada rango, que es donde se equivoca
// un `<` escrito por `<=`.
import { describe, it, expect } from 'vitest';
import {
  FORMA, INTERPOLACION_CUATRO_AGUAS, figuraCubierta, figuraPared, reduccionPared,
  alturaDe, zonasDe, layoutDe, gcpDeFuente,
} from '../src/engine/cyrFiguras.js';
import { FIGURAS, UBICACION } from '../src/constants/cyrCurvas.js';
import { LAYOUT } from '../src/engine/cyrZonas.js';
import { gcp } from '../src/engine/cyr.js';
import {
  TIPO_ELEMENTO, TIPOS_LISTA, ETIQUETA_TIPO, areaEfectiva, avisoSPRFV, AREA_SPRFV,
} from '../src/engine/cyrElementos.js';

const figDe = (forma, theta) => figuraCubierta({ forma, theta }).figura;

// ═══════════════════════════════════════════════════════════════════════════════
// SELECCIÓN DE FIGURA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cubiertas a dos aguas — los cuatro tramos y sus bordes', () => {
  it('cada rango cae en su figura, y el borde pertenece al rango de abajo', () => {
    const casos = [
      [0, "5.3-2A"], [7, "5.3-2A"], [7.01, "5.3-2B"], [20, "5.3-2B"],
      [20.01, "5.3-2C"], [27, "5.3-2C"], [27.01, "5.3-2D"], [45, "5.3-2D"],
    ];
    for (const [theta, esperada] of casos) {
      expect(figDe(FORMA.DOS_AGUAS, theta), `θ = ${theta}°`).toBe(esperada);
    }
  });

  it('pasados los 45° no hay figura, y no se adopta «la más parecida»', () => {
    const r = figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 50 });
    expect(r.tipo).toBe("noImplementada");
    expect(r.figura).toBeUndefined();
    expect(r.avisos[0].nivel).toBe("error");
    expect(r.motivo).toMatch(/llegan hasta 45°/);
    // Y el evaluador se niega, en vez de devolver un número de la 5.3-2D.
    expect(() => gcpDeFuente(r, { zona: "1", signo: "neg", A: 10 })).toThrow(/no hay figura aplicable/);
  });

  it('la cubierta plana va a la 5.3-2A', () => {
    expect(figDe(FORMA.PLANA, 0)).toBe("5.3-2A");
  });
});

describe('Cubiertas a cuatro aguas — y la interpolación de C 5.3.2', () => {
  it('los rangos tabulados', () => {
    expect(figDe(FORMA.CUATRO_AGUAS, 7.01)).toBe("5.3-2E");
    expect(figDe(FORMA.CUATRO_AGUAS, 20)).toBe("5.3-2E");
    expect(figDe(FORMA.CUATRO_AGUAS, 20.01)).toBe("5.3-2F");
    expect(figDe(FORMA.CUATRO_AGUAS, 27)).toBe("5.3-2F");
    expect(figDe(FORMA.CUATRO_AGUAS, 45)).toBe("5.3-2G");
  });

  it('con θ ≤ 7° se adopta la 5.3-2A, y se declara por qué', () => {
    // La 5.3-2A se titula «cubiertas a dos aguas». Usarla en cuatro aguas es una decisión
    // de lectura —el paso 6 del art. 5.3 agrupa planas, dos y cuatro aguas bajo la
    // Figura 5.3-2, y dentro de esa familia es la única que cubre θ ≤ 7°—, así que va con
    // aviso visible y no en silencio.
    const r = figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 5 });
    expect(r.figura).toBe("5.3-2A");
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatchObject({ nivel: "info", ref: "art. 5.3, paso 6" });
  });

  it('entre 27° y 45° interpola en θ entre la 2F y la 2G', () => {
    const r = figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 36 });
    expect(r).toMatchObject({ tipo: "interpolacion", desde: "5.3-2F", hasta: "5.3-2G" });
    expect(r.t).toBeCloseTo(0.5, 10);                    // 36° es el medio de 27–45
    expect(INTERPOLACION_CUATRO_AGUAS).toEqual({ desde: "5.3-2F", hasta: "5.3-2G", theta1: 27, theta2: 45 });
  });

  it('la interpolación se hace ZONA POR ZONA y después de leer cada curva', () => {
    // C 5.3.2. No es lo mismo que mezclar las curvas y leer después: la lectura es lineal
    // en log A, así que el orden de las dos operaciones cambia el resultado salvo que se
    // lea justo en un punto de quiebre.
    const r = figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 36 });
    const A = 7;
    const enF = gcp(FIGURAS["5.3-2F"].curvas.cubierta["3"].neg, A);
    const enG = gcp(FIGURAS["5.3-2G"].curvas.cubierta["3"].neg, A);
    const v = gcpDeFuente(r, { zona: "3", signo: "neg", A });
    expect(v.valor).toBeCloseTo(enF + 0.5 * (enG - enF), 12);
    expect(v.interpoladoEnTheta).toBe(true);
    expect(v.extremos).toMatchObject({ "5.3-2F": enF, "5.3-2G": enG, t: 0.5 });
  });

  it('los extremos de la interpolación devuelven exactamente cada figura', () => {
    const A = 7;
    const justoArriba = gcpDeFuente(figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 27.0001 }),
      { zona: "2", signo: "neg", A });
    expect(justoArriba.valor).toBeCloseTo(gcp(FIGURAS["5.3-2F"].curvas.cubierta["2"].neg, A), 4);
    const casi45 = gcpDeFuente(figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 44.9999 }),
      { zona: "2", signo: "neg", A });
    expect(casi45.valor).toBeCloseTo(gcp(FIGURAS["5.3-2G"].curvas.cubierta["2"].neg, A), 4);
  });

  it('la interpolación conserva la zonificación de cuatro aguas', () => {
    const r = figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 36 });
    expect(layoutDe(r)).toBe(LAYOUT.CUATRO_AGUAS);
    expect(zonasDe(r)).toEqual(["1", "2", "3"]);
  });

  it('pasados los 45° no hay figura', () => {
    expect(figuraCubierta({ forma: FORMA.CUATRO_AGUAS, theta: 50 }).tipo).toBe("noImplementada");
  });
});

describe('Vertiente única — el tramo que sí está y los dos que faltan', () => {
  it('con θ ≤ 3° la nota 5 de la 5.3-5A manda a la 5.3-2A', () => {
    const r = figuraCubierta({ forma: FORMA.VERTIENTE_UNICA, theta: 3 });
    expect(r.figura).toBe("5.3-2A");
    expect(r.avisos[0].ref).toBe("Fig. 5.3-5A, nota 5");
  });

  it('entre 3° y 30° la figura existe en el reglamento pero no está transcripta', () => {
    for (const [theta, fig] of [[5, "5.3-5A"], [10, "5.3-5A"], [20, "5.3-5B"], [30, "5.3-5B"]]) {
      const r = figuraCubierta({ forma: FORMA.VERTIENTE_UNICA, theta });
      expect(r.tipo, `θ = ${theta}°`).toBe("noImplementada");
      // El motivo distingue «no está en el reglamento» de «no está en el repositorio»,
      // que para el proyectista son dos situaciones distintas.
      expect(r.motivo, `θ = ${theta}°`).toContain(fig);
      expect(r.motivo, `θ = ${theta}°`).toMatch(/todavía no está transcripta/);
    }
  });

  it('pasados los 30° no hay figura en el reglamento', () => {
    const r = figuraCubierta({ forma: FORMA.VERTIENTE_UNICA, theta: 35 });
    expect(r.motivo).toMatch(/llega hasta 30°/);
  });
});

describe('Formas fuera del alcance y datos imposibles', () => {
  it('una forma no implementada lo dice, y lista las que quedan afuera', () => {
    const r = figuraCubierta({ forma: FORMA.OTRA, theta: 15 });
    expect(r.tipo).toBe("noImplementada");
    expect(r.motivo).toMatch(/diente de sierra/);
    expect(r.motivo).toMatch(/mansarda/);
  });

  it('una pendiente inválida no elige figura', () => {
    for (const theta of [NaN, -5, Infinity]) {
      expect(figuraCubierta({ forma: FORMA.DOS_AGUAS, theta }).tipo, `θ = ${theta}`)
        .toBe("noImplementada");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAREDES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Paredes — Fig. 5.3-1 y su nota 5', () => {
  it('la figura de pared no depende de la cubierta', () => {
    expect(figuraPared()).toMatchObject({ tipo: "figura", figura: "5.3-1" });
    expect(zonasDe(figuraPared())).toEqual(["4", "5"]);
    expect(layoutDe(figuraPared())).toBe(LAYOUT.PARED);
  });

  it('con θ ≤ 10° los (GC_p) de pared se reducen un 10 %', () => {
    expect(reduccionPared(10)).toMatchObject({ factor: 0.9, aplica: true });
    expect(reduccionPared(10.01)).toMatchObject({ factor: 1, aplica: false });
    expect(reduccionPared(0)).toMatchObject({ factor: 0.9, aplica: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA UBICACIÓN DEL ELEMENTO — la curva del alero no es de la cubierta
// ═══════════════════════════════════════════════════════════════════════════════

describe('Ubicación del elemento', () => {
  it('un elemento de cubierta sobre el recinto NUNCA usa la curva del alero', () => {
    // Los dos gráficos de la Fig. 5.3-2A son ubicaciones del elemento, no variantes del
    // edificio: un edificio con voladizo NO pasa a calcular toda su cubierta con la curva
    // del alero. Este test es la guarda de ese error, que daría succiones distintas en
    // toda la cubierta sin que nada lo avise.
    const r = figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 5 });
    const enCubierta = gcpDeFuente(r, { zona: "1'", signo: "neg", A: 1, ubicacion: UBICACION.CUBIERTA });
    expect(enCubierta.valor).toBeCloseTo(-0.9, 10);       // gráfico CUBIERTAS
    // El de alero existe, y es OTRO número: si la app lo usara por defecto, daría −1,7.
    const enVoladizo = gcpDeFuente(r, { zona: "1'", signo: "neg", A: 1, ubicacion: UBICACION.VOLADIZO });
    expect(enVoladizo.valor).toBeCloseTo(-1.7, 10);
    // Y la ubicación por defecto, que es la que usa la etapa 5.1, es la de cubierta.
    expect(gcpDeFuente(r, { zona: "1'", signo: "neg", A: 1 }).valor).toBe(enCubierta.valor);
  });

  it('las figuras sin gráfico de alero se niegan a dar uno', () => {
    // En las Figs. 5.3-2B a 2G el voladizo se arma por suma (art. 5.7): no hay curva de
    // alero que ofrecer, y devolver la de cubierta en su lugar sería inventarla.
    for (const theta of [15, 25, 40]) {
      const r = figuraCubierta({ forma: FORMA.DOS_AGUAS, theta });
      expect(() => gcpDeFuente(r, { zona: "1", signo: "neg", A: 10, ubicacion: UBICACION.VOLADIZO }),
        `θ = ${theta}°`).toThrow(/no tiene curva para la ubicación/);
    }
  });

  it('una pared no se lee con la ubicación de cubierta', () => {
    expect(() => gcpDeFuente(figuraPared(), { zona: "4", signo: "neg", A: 10 }))
      .toThrow(/no tiene curva para la ubicación/);
    expect(gcpDeFuente(figuraPared(),
      { zona: "4", signo: "neg", A: 1, ubicacion: UBICACION.PARED }).valor).toBeCloseTo(-1.1, 10);
  });

  it('una zona que no es de esa figura se rechaza', () => {
    const r = figuraCubierta({ forma: FORMA.DOS_AGUAS, theta: 15 });
    expect(() => gcpDeFuente(r, { zona: "1'", signo: "neg", A: 10 })).toThrow(/no tiene zona/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA ALTURA DE LA FIGURA
// ═══════════════════════════════════════════════════════════════════════════════

describe('alturaDe — cuál de las dos alturas, y por qué', () => {
  it('la 5.3-2A usa la del alero siempre, sin condición de θ', () => {
    expect(alturaDe("5.3-2A", 0).cual).toBe("alero");
    expect(alturaDe("5.3-2A", 7).cual).toBe("alero");
  });

  it('la 5.3-2C, 2D y 2G usan siempre la altura media', () => {
    for (const fig of ["5.3-2C", "5.3-2D", "5.3-2G"]) {
      expect(alturaDe(fig, 25).cual, fig).toBe("media");
      expect(alturaDe(fig, 5).cual, fig).toBe("media");
    }
  });

  it('la 5.3-1, 2B, 2E y 2F cambian en θ = 10°', () => {
    for (const fig of ["5.3-1", "5.3-2B", "5.3-2E", "5.3-2F"]) {
      expect(alturaDe(fig, 10).cual, fig).toBe("alero");
      expect(alturaDe(fig, 10.01).cual, fig).toBe("media");
    }
  });

  it('siempre dice el motivo, que es lo que se controla contra el papel', () => {
    for (const fig of Object.keys(FIGURAS)) {
      expect(alturaDe(fig, 5).porque, fig).toMatch(new RegExp(fig.replace(/\./g, "\\.")));
      expect(alturaDe(fig, 30).porque, fig).toBeTruthy();
    }
  });

  it('rechaza una figura que no existe', () => {
    expect(() => alturaDe("5.3-9Z", 10)).toThrow(/figura desconocida/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ÁREA EFECTIVA DE VIENTO
// ═══════════════════════════════════════════════════════════════════════════════

describe('areaEfectiva — art. 1.2 y la regla del tercio', () => {
  it('los dos ejemplos del proyectista', () => {
    const correa = areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 6, s: 1.5 });
    expect(correa.A).toBeCloseTo(12, 10);            // 6 × máx(1,50; 2,00)
    expect(correa.mandaTercio).toBe(true);
    const montante = areaEfectiva({ tipo: TIPO_ELEMENTO.MONTANTE, L: 3, s: 0.4 });
    expect(montante.A).toBeCloseTo(3, 10);           // 3 × máx(0,40; 1,00)
    expect(montante.mandaTercio).toBe(true);
  });

  it('cuando la separación es grande, manda la separación', () => {
    const r = areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 6, s: 3 });
    expect(r.A).toBeCloseTo(18, 10);
    expect(r.mandaTercio).toBe(false);
    expect(r.avisos).toHaveLength(0);
  });

  it('el área tributaria es OTRA cosa que el área efectiva, y se devuelven las dos', () => {
    // C 1.2: el (GC_p) se lee con A, pero la presión se aplica sobre el área tributaria
    // real. Confundirlas sobredimensiona, y es la confusión más fácil del capítulo.
    const r = areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 6, s: 1.5 });
    expect(r.A).toBeCloseTo(12, 10);
    expect(r.tributaria).toBeCloseTo(9, 10);
    expect(r.avisos[0].ref).toBe("C 1.2");
    expect(r.avisos[0].texto).toMatch(/9,00 m²/);
  });

  it('olvidarse del tercio da un (GC_p) MÁS desfavorable, que es por qué no se nota', () => {
    // La correa del ejemplo: con A = 12 m² la curva ya bajó; con los 9 m² tributarios el
    // coeficiente es más negativo. El error queda del lado seguro y sobrevive a cualquier
    // control de resultados.
    const curva = FIGURAS["5.3-2A"].curvas.cubierta["2"].neg;
    expect(gcp(curva, 9)).toBeLessThan(gcp(curva, 12));
  });

  it('la cuenta viene escrita, con los dos candidatos a la vista', () => {
    const r = areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 6, s: 1.5 });
    expect(r.cuenta).toBe("A = L · máx(s; L/3) = 6,00 · máx(1,50; 2,00) = 6,00 · 2,00 = 12,00 m²");
  });

  it('la fijación NO lleva la regla del tercio', () => {
    const r = areaEfectiva({ tipo: TIPO_ELEMENTO.FIJACION, area: 0.36 });
    expect(r.A).toBeCloseTo(0.36, 10);
    expect(r.cuenta).toMatch(/sin la regla de L\/3/);
  });

  it('la abertura apoyada en tres o más lados usa su propia área', () => {
    expect(areaEfectiva({ tipo: TIPO_ELEMENTO.ABERTURA, area: 4.5 }).A).toBeCloseTo(4.5, 10);
  });

  it('«otro» declara que el área la puso el proyectista', () => {
    const r = areaEfectiva({ tipo: TIPO_ELEMENTO.OTRO, area: 7 });
    expect(r.A).toBe(7);
    expect(r.avisos[0].texto).toMatch(/la declaró el proyectista/);
  });

  it('rechaza datos faltantes en vez de calcular con ceros', () => {
    expect(() => areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 6 })).toThrow(/luz y separación/);
    expect(() => areaEfectiva({ tipo: TIPO_ELEMENTO.CORREA, L: 0, s: 1 })).toThrow(/luz y separación/);
    expect(() => areaEfectiva({ tipo: TIPO_ELEMENTO.FIJACION })).toThrow(/área tributaria/);
    expect(() => areaEfectiva({ tipo: TIPO_ELEMENTO.ABERTURA, area: -1 })).toThrow(/necesita su área/);
    expect(() => areaEfectiva({ tipo: "viga" })).toThrow(/tipo de elemento desconocido/);
  });

  it('todos los tipos están en la lista y tienen etiqueta', () => {
    expect(new Set(TIPOS_LISTA)).toEqual(new Set(Object.values(TIPO_ELEMENTO)));
    for (const t of TIPOS_LISTA) expect(ETIQUETA_TIPO[t], t).toBeTruthy();
  });
});

describe('art. 5.2.3 — el umbral de 65 m²', () => {
  it('avisa recién pasados los 65 m², y como info', () => {
    expect(avisoSPRFV(AREA_SPRFV)).toHaveLength(0);
    const a = avisoSPRFV(70);
    expect(a).toHaveLength(1);
    // Es `info` y no `aviso`: el artículo PERMITE diseñarlo como SPRFV, no lo exige, y
    // verificarlo como C&R queda del lado seguro.
    expect(a[0]).toMatchObject({ nivel: "info", ref: "art. 5.2.3" });
  });
});
