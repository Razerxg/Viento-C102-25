// CAPÍTULO 4 — CARGAS SOBRE ACCESORIOS Y OTRAS ESTRUCTURAS.
//
// Las tablas de este capítulo se leyeron de un PDF ESCANEADO, de la imagen, sin capa de
// texto. Un coeficiente mal leído da una fuerza plausible y un cálculo entero equivocado
// que ningún control de ingeniería detecta. Por eso cada tabla lleva su verificación, y la
// más fuerte de todas es la primera: el propio reglamento da, en el comentario, la
// expresión con la que generó los coeficientes de la Figura 4.4-1.
import { describe, it, expect } from 'vitest';
import {
  BS_CARTEL, SH_CARTEL, CF_CARTEL_AB, cfCartelAjuste,
  BS_CASO_C_A, CF_CASO_C_A, CF_CASO_C_B, CASO_C_REGIONES,
  HD_CHIMENEA, CF_CHIMENEA, CF_RETICULADO, CF_TORRE,
  FACTOR_TORRE_REDONDOS, FACTOR_TORRE_DIAGONAL,
  CF_SILO_AISLADO, CP_TECHO_SILO, SOLAR,
} from '../src/constants/cap4.js';
import {
  interpGrilla, cfCartelLleno, cfCartelCasoC, factorPorosidad, reduccionesEspesor,
  cfChimenea, cfReticulado, cfTorre, gcrEquipo, esSupercritico, regimenCilindro,
  regimenSilo, zonasTechoSilo, cpTechoSilo, cfParedSilo, cpFondoSilo,
  fuerza, qEn, trazaBase,
} from '../src/engine/otrasEstructuras.js';
import { KD, kdDe } from '../src/constants/direccionalidad.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EL HARNESS: LA FIGURA 4.4-1 CONTRA LA EXPRESIÓN DE SU PROPIO COMENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

describe('Figura 4.4-1 — las 84 celdas del caso A y B', () => {
  // ⚠ ESTE ES EL TEST QUE JUSTIFICA HABER TRANSCRIPTO LA TABLA.
  //
  // El comentario C 4.4.1 (pág. 4-102) da un ajuste de superficie a los datos de túnel de
  // viento y dice que los coeficientes de los casos A y B «se generaron a partir de la
  // expresión precedente y luego se redondearon a los 0,05 más próximos». O sea que la
  // tabla y la fórmula son dos transcripciones independientes del MISMO dato, hechas por
  // los autores de la norma: si una cifra está mal leída del escaneo, no cierran.
  //
  // Es el mismo mecanismo que la Tabla 1.13-1 contra la fórmula de K_z, y que los 228
  // espesores del catálogo de caños de soporte-elevado-v4 contra la grilla de pulgadas.
  it('cada celda es la expresión del comentario redondeada a 0,05', () => {
    let celdas = 0;
    SH_CARTEL.forEach((sh, i) => {
      BS_CARTEL.forEach((bs, j) => {
        const esperado = Math.round(cfCartelAjuste(bs, sh) / 0.05) * 0.05;
        expect(CF_CARTEL_AB[i][j], `s/h = ${sh}, B/s = ${bs}`).toBeCloseTo(esperado, 10);
        celdas++;
      });
    });
    expect(celdas).toBe(84);
  });

  it('la tabla tiene la forma de la figura', () => {
    expect(CF_CARTEL_AB).toHaveLength(SH_CARTEL.length);
    for (const fila of CF_CARTEL_AB) expect(fila).toHaveLength(BS_CARTEL.length);
  });

  // Relaciones físicas, independientes de la fórmula: si alguien un día reemplaza la tabla
  // por otra fuente, estas dos tienen que seguir valiéndose.
  it('el coeficiente CRECE al bajar s/h — un cartel más separado del suelo carga más', () => {
    // Las filas están en s/h decreciente, así que el valor tiene que crecer hacia abajo.
    for (let j = 0; j < BS_CARTEL.length; j++) {
      for (let i = 0; i < CF_CARTEL_AB.length - 1; i++) {
        expect(CF_CARTEL_AB[i + 1][j], `columna B/s = ${BS_CARTEL[j]}`)
          .toBeGreaterThanOrEqual(CF_CARTEL_AB[i][j]);
      }
    }
  });

  it('para una pared apoyada en el suelo (s/h = 1) el coeficiente DECRECE con B/s', () => {
    const fila = CF_CARTEL_AB[0];
    for (let j = 0; j < fila.length - 1; j++) {
      expect(fila[j + 1]).toBeLessThanOrEqual(fila[j]);
    }
    // …y el salto entre los extremos es real, no ruido de redondeo
    expect(fila[0] - fila[fila.length - 1]).toBeGreaterThan(0.4);
  });
});

describe('interpolación de la Figura 4.4-1', () => {
  it('en los puntos de la grilla devuelve la celda exacta', () => {
    // s/h = 0,5 y B/s = 2 → fila 4, columna 6 de la figura
    const r = cfCartelLleno({ B: 2, s: 1, h: 2 });
    expect(r.Bs).toBeCloseTo(2, 10);
    expect(r.sh).toBeCloseTo(0.5, 10);
    expect(r.cf).toBeCloseTo(1.70, 10);
  });

  it('un cartel apoyado en el suelo toma la fila s/h = 1', () => {
    const r = cfCartelLleno({ B: 10, s: 5, h: 5 });   // s/h = 1, B/s = 2
    expect(r.cf).toBeCloseTo(1.40, 10);
  });

  // ⚠ LAS FILAS DE LA TABLA VAN EN s/h DECRECIENTE. Si alguien interpola sin invertirlas,
  // este caso devuelve el valor del otro extremo y sigue pareciendo un coeficiente válido.
  it('no confunde el sentido de las filas', () => {
    const alto = cfCartelLleno({ B: 1, s: 1, h: 1 });      // s/h = 1  → 1,45
    const bajo = cfCartelLleno({ B: 1, s: 0.2, h: 1 });    // s/h = 0,2 → 1,80
    expect(alto.cf).toBeCloseTo(1.45, 10);
    expect(bajo.cf).toBeCloseTo(1.80, 10);
    expect(bajo.cf).toBeGreaterThan(alto.cf);
  });

  it('interpola dentro de una celda, sin saltar', () => {
    const r = cfCartelLleno({ B: 1.5, s: 1, h: 1 });   // B/s = 1,5 entre 1 y 2, s/h = 1
    expect(r.cf).toBeGreaterThan(1.40);
    expect(r.cf).toBeLessThan(1.45);
  });

  it('congela los extremos en vez de extrapolar', () => {
    // «≤ 0,05» y «≥ 45» son los rótulos de la propia figura: más allá vale el mismo valor.
    expect(cfCartelLleno({ B: 0.01, s: 1, h: 1 }).cf).toBeCloseTo(1.80, 10);
    expect(cfCartelLleno({ B: 1000, s: 1, h: 1 }).cf).toBeCloseTo(1.30, 10);
  });

  it('s/h nunca supera 1 — un cartel no se hunde en el suelo', () => {
    expect(cfCartelLleno({ B: 1, s: 5, h: 2 }).sh).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASO C
// ═══════════════════════════════════════════════════════════════════════════════

describe('Figura 4.4-1, caso C', () => {
  // La verificación estructural de esta tabla: el número de regiones de cada columna es un
  // DATO —lo dice el comentario—, y las regiones tienen que TESELAR el ancho B. Una celda
  // mal leída como número donde iba un vacío rompe las dos cosas a la vez.
  it('el número de regiones crece con B/s, como dice el comentario', () => {
    const cuenta = (j) => ["0-s", "s-2s", "2s-3s", "3s-10s"]
      .filter(id => CF_CASO_C_A[id][j] !== null).length;
    expect(cuenta(BS_CASO_C_A.indexOf(2))).toBe(2);
    expect(cuenta(BS_CASO_C_A.indexOf(3))).toBe(3);
    expect(cuenta(BS_CASO_C_A.indexOf(4))).toBe(4);
    expect(cuenta(BS_CASO_C_A.indexOf(10))).toBe(4);
    expect(Object.keys(CF_CASO_C_B)).toHaveLength(7);
  });

  it('las regiones teselan el ancho del cartel, sin huecos ni solapes', () => {
    for (const Bs of [2, 3, 4, 6, 10]) {
      const r = cfCartelCasoC({ B: Bs, s: 1, h: 1 });
      expect(r.aplica).toBe(true);
      let cursor = 0;
      for (const reg of r.regiones) {
        expect(reg.desde).toBeCloseTo(cursor, 9);
        cursor = reg.hasta;
      }
      expect(cursor, `B/s = ${Bs}`).toBeCloseTo(Bs, 9);
    }
  });

  it('el coeficiente de borde es el más alto y decae hacia adentro', () => {
    const r = cfCartelCasoC({ B: 8, s: 1, h: 1 });
    const cfs = r.regiones.map(x => x.cfTabla);
    for (let i = 0; i < cfs.length - 1; i++) expect(cfs[i + 1]).toBeLessThan(cfs[i]);
    expect(cfs[0]).toBeGreaterThan(3);
  });

  // ⚠ NO SE INTERPOLA ENTRE LAS COLUMNAS 10 Y 13: tienen cuatro y siete regiones. Un motor
  // que devolviera un número ahí estaría inventando un reparto que la figura no da.
  it('se niega a interpolar entre B/s = 10 y B/s = 13', () => {
    const r = cfCartelCasoC({ B: 11.5, s: 1, h: 1 });
    expect(r.aplica).toBe(false);
    expect(r.motivo).toMatch(/regiones/);
  });

  it('no aplica por debajo de B/s = 2, como manda la nota 2', () => {
    const r = cfCartelCasoC({ B: 1.5, s: 1, h: 1 });
    expect(r.aplica).toBe(false);
  });

  it('la nota 3 reduce cuando s/h > 0,8, y sólo entonces', () => {
    // Los dos con el MISMO B/s = 6: si se cambiara el ancho a la vez que la altura, el
    // C_f de tabla también cambiaría y la comparación no aislaría el factor de la nota 3.
    const con = cfCartelCasoC({ B: 6, s: 1, h: 1 });          // s/h = 1   → factor 0,8
    const sin = cfCartelCasoC({ B: 3, s: 0.5, h: 1 });        // s/h = 0,5 → factor 1
    expect(con.fNota3).toBeCloseTo(0.8, 10);
    expect(sin.fNota3).toBe(1);
    expect(con.regiones[1].cf).toBeCloseTo(con.regiones[1].cfTabla * 0.8, 10);
  });

  it('la esquina de retorno reduce SÓLO la primera región', () => {
    const sin = cfCartelCasoC({ B: 6, s: 1, h: 2 });
    const con = cfCartelCasoC({ B: 6, s: 1, h: 2, Lr: 1 });   // L_r/s = 1 → 0,75
    expect(con.fEsq).toBeCloseTo(0.75, 10);
    expect(con.regiones[0].cf).toBeCloseTo(sin.regiones[0].cf * 0.75, 10);
    expect(con.regiones[1].cf).toBeCloseTo(sin.regiones[1].cf, 10);
  });
});

describe('notas 1 y 2 de la Figura 4.4-1', () => {
  it('la porosidad reduce, y no linealmente', () => {
    expect(factorPorosidad(1)).toBe(1);
    // con la mitad del área sólida el arrastre NO cae a la mitad
    const f = factorPorosidad(0.5);
    expect(f).toBeGreaterThan(0.5);
    expect(f).toBeLessThan(1);
    expect(f).toBeCloseTo(1 - Math.pow(0.5, 1.5), 10);
  });

  it('las reducciones por espesor tienen su condición de aplicación', () => {
    const grueso = reduccionesEspesor({ B: 10, s: 2, t: 1 });   // Rmax = 0,1 · Rmin = 0,5
    expect(grueso.excentricidadAplica).toBe(true);
    expect(grueso.factorAplica).toBe(true);
    expect(grueso.excentricidad).toBeCloseTo(0.2 - 0.25 * 0.1, 10);
    expect(grueso.factorCf).toBeCloseTo(1 - 0.133 * 0.5, 10);

    // Fuera de condición, NO se aplica la reducción: se vuelve al 0,2·B de la nota 2.
    const muyGrueso = reduccionesEspesor({ B: 2, s: 2, t: 1.8 });  // Rmax = 0,9
    expect(muyGrueso.excentricidadAplica).toBe(false);
    expect(muyGrueso.excentricidad).toBe(0.2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIGURA 4.5-1 · 4.5-2 · 4.5-3
// ═══════════════════════════════════════════════════════════════════════════════

describe('Figura 4.5-1 — chimeneas y tanques', () => {
  it('devuelve los valores tabulados en h/D = 1, 7 y 25', () => {
    for (const fila of CF_CHIMENEA) {
      HD_CHIMENEA.forEach((hd, k) => {
        const r = cfChimenea({ filaId: fila.id, h: hd, D: 1 });
        expect(r.cf, `${fila.id} en h/D = ${hd}`).toBeCloseTo(fila.cf[k], 10);
      });
    }
  });

  it('el coeficiente crece con la esbeltez en todas las filas', () => {
    // Es la firma física de la tabla: cuanto más esbelta la estructura, menos alivio da el
    // flujo que la rodea por arriba.
    for (const fila of CF_CHIMENEA) {
      expect(fila.cf[1], fila.id).toBeGreaterThan(fila.cf[0]);
      expect(fila.cf[2], fila.id).toBeGreaterThan(fila.cf[1]);
    }
  });

  it('la sección cuadrada de cara carga más que la misma girada a 45°', () => {
    const cara = CF_CHIMENEA.find(f => f.id === "cuadrada_cara");
    const diag = CF_CHIMENEA.find(f => f.id === "cuadrada_diag");
    cara.cf.forEach((v, k) => expect(v).toBeGreaterThan(diag.cf[k]));
  });

  it('el cilindro liso supercrítico es el que menos carga de toda la figura', () => {
    const liso = CF_CHIMENEA.find(f => f.id === "circ_super_suave");
    const min = Math.min(...CF_CHIMENEA.flatMap(f => f.cf));
    expect(liso.cf[0]).toBe(min);
  });

  it('interpola en h/D, nota 2', () => {
    const r = cfChimenea({ filaId: "hex_oct", h: 4, D: 1 });   // entre 1 (1,0) y 7 (1,2)
    expect(r.cf).toBeCloseTo(1.0 + (4 - 1) / (7 - 1) * 0.2, 10);
  });

  it('congela fuera del rango tabulado', () => {
    expect(cfChimenea({ filaId: "hex_oct", h: 0.5, D: 1 }).cf).toBeCloseTo(1.0, 10);
    expect(cfChimenea({ filaId: "hex_oct", h: 100, D: 1 }).cf).toBeCloseTo(1.4, 10);
  });
});

describe('criterio de régimen del cilindro', () => {
  // ⚠ D·√q_z ESTÁ EN UNIDADES SI, con el umbral en 5,3. Tomar el 2,5 de las versiones en
  // libras por pie cuadrado cambiaría de fila y casi duplicaría el coeficiente.
  it('el umbral de 5,3 separa las dos filas', () => {
    expect(esSupercritico(1, 27)).toBe(false);      // √27 = 5,196 < 5,3
    expect(esSupercritico(1, 29)).toBe(true);       // √29 = 5,385 > 5,3
    expect(regimenCilindro(2, 900)).toBeCloseTo(60, 6);
  });

  it('un caso realista de la app cae del lado supercrítico', () => {
    // q_h ronda 1000 N/m² y un tanque tiene metros de diámetro: √1000 ≈ 31,6.
    expect(esSupercritico(3, 1000)).toBe(true);
  });
});

describe('Figura 4.5-2 — carteles abiertos y reticulados', () => {
  it('devuelve la banda de ε que corresponde', () => {
    expect(cfReticulado({ eps: 0.05, miembro: "plano" }).cf).toBe(2.0);
    expect(cfReticulado({ eps: 0.2, miembro: "plano" }).cf).toBe(1.8);
    expect(cfReticulado({ eps: 0.5, miembro: "plano" }).cf).toBe(1.6);
  });

  // ⚠ NO ES UN EJE CONTINUO: la figura da bandas y, a diferencia de la 4.5-1, NO autoriza
  // interpolar. Un motor que interpolara devolvería valores que la norma no da.
  it('no interpola entre bandas — dentro de una banda el valor es constante', () => {
    expect(cfReticulado({ eps: 0.11, miembro: "plano" }).cf)
      .toBe(cfReticulado({ eps: 0.28, miembro: "plano" }).cf);
  });

  it('por encima de ε = 0,7 se niega, con el motivo', () => {
    const r = cfReticulado({ eps: 0.8, miembro: "plano" });
    expect(r.cf).toBeNull();
    expect(r.motivo).toMatch(/0,7/);
  });

  it('los miembros circulares cargan menos que los de caras planas', () => {
    for (const b of CF_RETICULADO) {
      expect(b.circSub).toBeLessThan(b.plano);
      expect(b.circSuper).toBeLessThan(b.circSub);
    }
  });

  it('elige la columna de régimen según D·√q_z', () => {
    const sub = cfReticulado({ eps: 0.2, miembro: "circular", D: 0.05, qz: 1000 });
    const sup = cfReticulado({ eps: 0.2, miembro: "circular", D: 0.5, qz: 1000 });
    expect(sub.cf).toBe(1.3);
    expect(sup.cf).toBe(0.9);
  });
});

describe('Figura 4.5-3 — torres reticuladas', () => {
  it('los polinomios valen 4,0 y 3,4 en ε = 0', () => {
    expect(CF_TORRE.cuadrada.f(0)).toBeCloseTo(4.0, 10);
    expect(CF_TORRE.triangular.f(0)).toBeCloseTo(3.4, 10);
  });

  it('la torre cuadrada carga más que la triangular en todo el rango', () => {
    for (let e = 0.05; e <= 0.6; e += 0.05) {
      expect(CF_TORRE.cuadrada.f(e)).toBeGreaterThan(CF_TORRE.triangular.f(e));
    }
  });

  it('el coeficiente baja al llenarse la torre', () => {
    // Es el mismo efecto que en la Figura 4.5-2: una torre más llena se parece más a una
    // superficie continua y su C_f sobre el área SÓLIDA baja.
    expect(CF_TORRE.cuadrada.f(0.5)).toBeLessThan(CF_TORRE.cuadrada.f(0.1));
  });

  it('el factor de miembros redondos reduce y está topeado en 1,0', () => {
    expect(FACTOR_TORRE_REDONDOS(0.1)).toBeCloseTo(0.51 * 0.01 + 0.57, 10);
    // El tope sólo entra por encima de ε ≈ 0,92: con 0,9 la expresión todavía da 0,983 y
    // el factor SIGUE reduciendo. Afirmar que ahí ya vale 1 armaría el tope contra un
    // valor que no lo alcanza, y el test no probaría el tope sino el redondeo.
    expect(FACTOR_TORRE_REDONDOS(0.9)).toBeCloseTo(0.9831, 6);
    expect(FACTOR_TORRE_REDONDOS(0.9)).toBeLessThan(1);
    expect(FACTOR_TORRE_REDONDOS(1)).toBe(1.0);        // 0,51 + 0,57 = 1,08 → topeado
  });

  it('el factor de diagonal mayora y está topeado en 1,2', () => {
    expect(FACTOR_TORRE_DIAGONAL(0.2)).toBeCloseTo(1.15, 10);
    expect(FACTOR_TORRE_DIAGONAL(0.5)).toBe(1.2);
  });

  it('la diagonal NO se aplica a una torre triangular', () => {
    const r = cfTorre({ seccion: "triangular", eps: 0.2, diagonal: true });
    expect(r.fDia).toBe(1);
    expect(r.diagonalIgnorada).toBe(true);
  });

  it('compone los dos factores sobre el polinomio', () => {
    const r = cfTorre({ seccion: "cuadrada", eps: 0.2, redondos: true, diagonal: true });
    expect(r.cf).toBeCloseTo(CF_TORRE.cuadrada.f(0.2) * FACTOR_TORRE_REDONDOS(0.2)
      * FACTOR_TORRE_DIAGONAL(0.2), 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ART. 4.5.1 — EQUIPOS SOBRE CUBIERTA
// ═══════════════════════════════════════════════════════════════════════════════

describe('(GC_r) de equipos sobre cubierta', () => {
  it('vale 1,9 lateral y 1,5 vertical para un equipo chico', () => {
    expect(gcrEquipo({ tipo: "lateral", area: 1, B: 20, dim: 6 }).gcr).toBe(1.9);
    expect(gcrEquipo({ tipo: "vertical", area: 1, B: 20, dim: 30 }).gcr).toBe(1.5);
  });

  it('baja a 1,0 cuando el equipo llega al tamaño del edificio', () => {
    expect(gcrEquipo({ tipo: "lateral", area: 20 * 6, B: 20, dim: 6 }).gcr).toBe(1.0);
    expect(gcrEquipo({ tipo: "vertical", area: 20 * 30, B: 20, dim: 30 }).gcr).toBe(1.0);
  });

  it('interpola linealmente entre los dos límites', () => {
    // a mitad de camino entre 0,1·B·h y B·h
    const B = 20, h = 6;
    const medio = (0.1 * B * h + B * h) / 2;
    const r = gcrEquipo({ tipo: "lateral", area: medio, B, dim: h });
    expect(r.gcr).toBeCloseTo((1.9 + 1.0) / 2, 10);
    expect(r.reducido).toBe(true);
  });

  it('el límite bajo es exactamente 0,1·B·h y ahí todavía vale el máximo', () => {
    const r = gcrEquipo({ tipo: "lateral", area: 0.1 * 20 * 6, B: 20, dim: 6 });
    expect(r.bajo).toBeCloseTo(12, 10);
    expect(r.gcr).toBe(1.9);
  });

  it('no baja de 1,0 aunque el área supere la del edificio', () => {
    expect(gcrEquipo({ tipo: "lateral", area: 1e6, B: 20, dim: 6 }).gcr).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ART. 4.5.2 — SILOS Y TANQUES
// ═══════════════════════════════════════════════════════════════════════════════

describe('silos, tanques y recipientes cilíndricos', () => {
  it('clasifica por separación de centro a centro en diámetros', () => {
    expect(regimenSilo(1.0).modo).toBe("agrupado");
    expect(regimenSilo(1.5).modo).toBe("intermedio");
    expect(regimenSilo(2.5).modo).toBe("aislado");
  });

  it('el arrastre del cilindro aislado es 0,63 sobre la proyección D·H', () => {
    expect(CF_SILO_AISLADO).toBe(0.63);
    expect(cfParedSilo({ hd: 2, modo: "aislado" }).cf).toBe(0.63);
    // …y usa q_z, mientras que el agrupado usa q_h: no es un detalle de presentación,
    // cambia a qué altura se evalúa la presión dinámica.
    expect(cfParedSilo({ hd: 2, modo: "aislado" }).usarCon).toBe("q_z");
    expect(cfParedSilo({ hd: 2, modo: "agrupado" }).usarCon).toBe("q_h");
  });

  it('el silo agrupado arrastra bastante más que el aislado', () => {
    // El comentario mide un 65 % más sobre el cilindro del medio de una fila de tres.
    const grupo = cfParedSilo({ hd: 2, modo: "agrupado" }).cf;
    expect(grupo).toBeGreaterThan(CF_SILO_AISLADO * 1.5);
  });

  it('el C_f del grupo baja con la esbeltez', () => {
    expect(cfParedSilo({ hd: 1, modo: "agrupado" }).cf)
      .toBeGreaterThan(cfParedSilo({ hd: 4, modo: "agrupado" }).cf);
  });

  it('el techo de un silo aislado sólo tiene succión', () => {
    expect(CP_TECHO_SILO.zona1).toBeLessThan(0);
    expect(CP_TECHO_SILO.zona2).toBeLessThan(0);
    expect(CP_TECHO_SILO.zona1).toBeLessThan(CP_TECHO_SILO.zona2);
  });

  it('las zonas del techo cubren el diámetro', () => {
    const z = zonasTechoSilo({ D: 10, h: 12, H: 10, theta: 0 });
    expect(z.b + z.zona2).toBeCloseTo(10, 9);
  });

  it('con θ ≥ 10° las zonas son fijas en 0,6D y 0,4D', () => {
    const z = zonasTechoSilo({ D: 10, h: 12, H: 10, theta: 20 });
    expect(z.b).toBeCloseTo(6, 9);
    expect(z.zona2).toBeCloseTo(4, 9);
    expect(z.inclinado).toBe(true);
  });

  it('el techo del grupo succiona más que el del aislado', () => {
    const aislado = cpTechoSilo({ theta: 0, hd: 2 });
    const grupo = cpTechoSilo({ theta: 0, hd: 2, agrupado: true });
    expect(grupo.zona1).toBeLessThan(aislado.zona1);
  });

  it('el fondo separado del suelo se interpola a cero cuando casi apoya', () => {
    const lejos = cpFondoSilo({ C: 5, h: 10 });        // C/h = 0,5 ≥ 1/3
    const cerca = cpFondoSilo({ C: 10 / 6, h: 10 });   // C/h = 1/6, la mitad del límite
    expect(lejos.cp).toEqual([0.8, -0.6]);
    expect(lejos.reducido).toBe(false);
    expect(cerca.cp[0]).toBeCloseTo(0.4, 9);
    expect(cerca.cp[1]).toBeCloseTo(-0.3, 9);
  });

  it('los dos C_p del fondo son casos, no un rango', () => {
    // Uno empuja y el otro succiona: hay que verificar con los dos, no elegir el mayor.
    const r = cpFondoSilo({ C: 5, h: 10 });
    expect(r.cp[0]).toBeGreaterThan(0);
    expect(r.cp[1]).toBeLessThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA FUERZA Y EL K_d
// ═══════════════════════════════════════════════════════════════════════════════

describe('la fuerza de viento', () => {
  it('F = q·G·C_f·A', () => {
    expect(fuerza({ q: 1000, G: 0.85, cf: 1.8, area: 10 })).toBeCloseTo(15300, 6);
  });

  it('crece con el cuadrado de la velocidad, a través de q', () => {
    const sitio = { V: 50, exposicion: "C", Kzt: 1, altitud: 0, usarKe: true };
    const q1 = qEn(10, sitio, 0.85);
    const q2 = qEn(10, { ...sitio, V: 100 }, 0.85);
    expect(q2 / q1).toBeCloseTo(4, 6);
  });

  // ⚠ EL K_d DEL CAPÍTULO 4 NO ES 0,85. La Tabla 1.6-1 da un valor por tipo de estructura,
  // y adoptar el del edificio en una chimenea redonda baja la carga un 15 %.
  it('la Tabla 1.6-1 tiene un K_d propio para cada estructura del capítulo 4', () => {
    for (const clave of ["chim_cuadrada", "chim_hexagonal", "chim_redonda", "chim_octogonal",
      "cartel_lleno", "cartel_abierto", "torre_tri_cua", "torre_otra"]) {
      expect(KD.some(([k]) => k === clave), clave).toBe(true);
      expect(kdDe(clave)).toBeGreaterThan(0);
    }
  });

  it('la chimenea redonda usa K_d = 1,00 y no el 0,85 del edificio', () => {
    expect(kdDe("chim_redonda")).toBe(1.00);
    expect(kdDe("edificio_sprfv")).toBe(0.85);
    // …y eso es un 18 % más de presión dinámica sobre la misma estructura
    const sitio = { V: 55, exposicion: "C", Kzt: 1, altitud: 0, usarKe: true };
    expect(qEn(10, sitio, 1.00) / qEn(10, sitio, 0.85)).toBeCloseTo(1 / 0.85, 6);
  });

  it('la traza declara todos los pasos de la Tabla 4.1-1', () => {
    const sitio = { V: 55, exposicion: "B", Kzt: 1, altitud: 0, usarKe: true };
    const t = trazaBase({ sitio, kd: 0.85, z: 8, G: 0.85, etiquetaZ: "centroide" });
    const simbolos = t.map(x => x.simbolo);
    for (const s of ["V", "K_d", "K_z", "K_zt", "K_e", "q", "G"]) {
      expect(simbolos).toContain(s);
    }
    // cada paso dice de dónde sale: sin eso la traza no sirve para revisar nada
    for (const paso of t) expect(paso.ref.length).toBeGreaterThan(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PANELES SOLARES — lo poco que se puede dar sin inventar
// ═══════════════════════════════════════════════════════════════════════════════

describe('factores de paneles solares (art. 4.5.3 a 4.5.5)', () => {
  it('γ_p mayora por el parapeto y está topeado en 1,2', () => {
    // Los parapetos EMPEORAN las cargas sobre paneles: levantan los vórtices por encima
    // del techo y los juntan hacia el centro.
    expect(SOLAR.gammaP(0, 10)).toBeCloseTo(0.9, 10);
    expect(SOLAR.gammaP(3, 10)).toBeCloseTo(1.2, 10);
    expect(SOLAR.gammaP(10, 10)).toBe(1.2);
  });

  it('γ_c tiene piso en 0,8', () => {
    expect(SOLAR.gammaC(1)).toBe(0.8);
    expect(SOLAR.gammaC(5)).toBeCloseTo(0.9, 10);
  });

  // La Figura 4.5-8 es la ÚNICA curva de esta serie transcribible exacto: sus dos quiebres
  // caen sobre líneas de grilla, en A = 1 m² y A = 10 m².
  it('γ_a es la poligonal de la Figura 4.5-8', () => {
    expect(SOLAR.gammaA(0.5)).toBe(0.8);
    expect(SOLAR.gammaA(1)).toBe(0.8);
    expect(SOLAR.gammaA(10)).toBe(0.4);
    expect(SOLAR.gammaA(100)).toBe(0.4);
    // el tramo intermedio es lineal EN LOG A, no en A: el eje de la figura es logarítmico
    expect(SOLAR.gammaA(Math.sqrt(10))).toBeCloseTo(0.6, 9);
  });

  it('N_s es la frecuencia reducida de la expresión (4.5-12)', () => {
    expect(SOLAR.frecuenciaReducida(2, 3, 50)).toBeCloseTo(0.12, 10);
  });

  it('A_n usa la longitud característica más chica de las tres', () => {
    // L_b = mín(0,4·√(h·W_L), h, W_S), con piso de 4,5 m en el denominador.
    const An = SOLAR.areaNormalizada(10, 10, 100, 30);
    const Lb = Math.min(0.4 * Math.sqrt(10 * 100), 10, 30);   // 12,6 · 10 · 30 → 10
    expect(Lb).toBe(10);
    expect(An).toBeCloseTo(10 * (1000 / 100), 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORQUESTACIÓN — las dos decisiones que no se ven mirando el formulario
// ═══════════════════════════════════════════════════════════════════════════════

import { analizarAccesorio, analizarSilo, FAMILIAS, familiaDe } from '../src/engine/otrasEstructuras.js';

const SITIO = { V: 55, exposicion: "C", Kzt: 1, altitud: 0, usarKe: true };

describe('a qué altura se evalúa q', () => {
  // ⚠ NO ES LA MISMA EN LAS DOS EXPRESIONES, y es invisible en el resultado: usar el
  // centroide en un cartel da una fuerza apenas menor, perfectamente plausible.
  it('un cartel usa q_h, con h el BORDE SUPERIOR — expresión (4.4-1)', () => {
    const r = analizarAccesorio({ familia: "cartel_lleno",
      datos: { B: 6, s: 2, h: 8 }, sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.z).toBe(8);
    expect(r.q).toBeCloseTo(qEn(8, SITIO, 0.85), 9);
  });

  it('una chimenea usa q_z al CENTROIDE del área proyectada — expresión (4.5-1)', () => {
    const r = analizarAccesorio({ familia: "chimenea",
      datos: { h: 20, D: 2, filaChimenea: "circ_super_suave" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.z).toBe(10);
    expect(r.q).toBeCloseTo(qEn(10, SITIO, 1.0), 9);
  });

  it('un equipo sobre cubierta usa q_h DEL EDIFICIO, no su propia altura', () => {
    const r = analizarAccesorio({ familia: "equipo",
      datos: { Bedif: 30, hedif: 12, Ledif: 40, Af: 5, Ar: 8 },
      sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.z).toBe(12);
  });
});

describe('qué área multiplica al coeficiente', () => {
  it('el cartel lleno usa el área TOTAL', () => {
    const r = analizarAccesorio({ familia: "cartel_lleno",
      datos: { B: 6, s: 2, h: 8 }, sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.area).toBeCloseTo(12, 9);
  });

  // ⚠ EL ERROR QUE DUPLICA LA FUERZA: la nota 3 de la Figura 4.5-2 dice que el área
  // consistente con esos coeficientes es la SÓLIDA proyectada, no la envolvente.
  it('el cartel abierto usa el área SÓLIDA, no la envolvente', () => {
    const r = analizarAccesorio({ familia: "cartel_abierto",
      datos: { B: 6, s: 2, h: 8, eps: 0.2, miembro: "plano" },
      sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.area).toBeCloseTo(6 * 2 * 0.2, 9);
    expect(r.area).toBeLessThan(6 * 2);
  });

  it('la torre usa el área sólida de UNA cara', () => {
    const r = analizarAccesorio({ familia: "torre",
      datos: { h: 30, B: 2, eps: 0.25, seccionTorre: "cuadrada" },
      sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.area).toBeCloseTo(30 * 2 * 0.25, 9);
  });
});

describe('el (GC_r) no se multiplica por G', () => {
  // Art. 1.9.7: donde el reglamento da el producto, el factor de ráfaga ya está adentro.
  // Multiplicar otra vez por 0,85 baja la carga un 15 % sobre un equipo de azotea.
  it('la fuerza del equipo sale de q·(GC_r)·A, sin G aparte', () => {
    const r = analizarAccesorio({ familia: "equipo",
      datos: { Bedif: 30, hedif: 12, Ledif: 40, Af: 5, Ar: 8 },
      sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.G).toBe(1);
    expect(r.F).toBeCloseTo(r.q * r.cf * r.area, 6);
  });

  it('las demás familias SÍ llevan G', () => {
    const r = analizarAccesorio({ familia: "cartel_lleno",
      datos: { B: 6, s: 2, h: 8 }, sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.G).toBe(0.85);
    expect(r.F).toBeCloseTo(r.q * 0.85 * r.cf * r.area, 6);
  });
});

describe('avisos del capítulo 4', () => {
  it('exige el caso C cuando B/s ≥ 2', () => {
    const r = analizarAccesorio({ familia: "cartel_lleno",
      datos: { B: 12, s: 2, h: 4 }, sitio: SITIO, kd: 0.85, G: 0.85 });
    expect(r.avisos.some(a => /caso C/.test(a.texto))).toBe(true);
  });

  it('detecta la fila de régimen equivocada en un cilindro', () => {
    // Un tanque de 3 m con q del orden de 1000 N/m² está en régimen SUPERCRÍTICO; elegir
    // la fila subcrítica no rompe nada visible y cambia el coeficiente casi al doble.
    const r = analizarAccesorio({ familia: "chimenea",
      datos: { h: 12, D: 3, filaChimenea: "circ_sub" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.avisos.some(a => a.tono === "error" && /régimen/i.test(a.texto))).toBe(true);
  });

  it('no avisa cuando la fila coincide con el régimen', () => {
    const r = analizarAccesorio({ familia: "chimenea",
      datos: { h: 12, D: 3, filaChimenea: "circ_super_suave" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.avisos.some(a => a.tono === "error")).toBe(false);
  });

  it('cada familia declara su K_d por defecto y existe en la Tabla 1.6-1', () => {
    for (const f of FAMILIAS) {
      expect(kdDe(f.kd), f.id).toBeGreaterThan(0);
      expect(familiaDe(f.id).id).toBe(f.id);
    }
  });
});

describe('silos y tanques — art. 4.5.2', () => {
  const base = { D: 10, H: 20, theta: 0, separacion: 5 };

  it('el techo lleva los DOS casos de presión interna', () => {
    const r = analizarSilo({ datos: base, sitio: SITIO, kd: 1.0, G: 0.85, gcpi: 0.18 });
    for (const z of r.techo) {
      expect(z.conInternaPos).not.toBeCloseTo(z.conInternaNeg, 3);
      // ambas son succiones fuertes: el Cp es negativo y grande
      expect(z.cp).toBeLessThan(0);
    }
  });

  it('las zonas del techo cubren el diámetro', () => {
    const r = analizarSilo({ datos: base, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.zonas.b + r.zonas.zona2).toBeCloseTo(10, 9);
  });

  it('el aislado evalúa q al centroide del cilindro y el agrupado a la altura media', () => {
    const aislado = analizarSilo({ datos: base, sitio: SITIO, kd: 1.0, G: 0.85 });
    const grupo = analizarSilo({ datos: { ...base, separacion: 1.1 }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(aislado.reg.modo).toBe("aislado");
    expect(aislado.zPared).toBeCloseTo(10, 9);      // H/2
    expect(grupo.reg.modo).toBe("agrupado");
    expect(grupo.zPared).toBeCloseTo(grupo.h, 9);
  });

  it('el silo agrupado arrastra bastante más que el mismo silo aislado', () => {
    const aislado = analizarSilo({ datos: base, sitio: SITIO, kd: 1.0, G: 0.85 });
    const grupo = analizarSilo({ datos: { ...base, separacion: 1.1 }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(grupo.Fpared).toBeGreaterThan(aislado.Fpared * 1.4);
  });

  it('avisa cuando se sale del alcance de la Figura 4.5-4', () => {
    const alto = analizarSilo({ datos: { D: 10, H: 60, theta: 0 }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(alto.avisos.some(a => a.tono === "error")).toBe(true);
    const chato = analizarSilo({ datos: { D: 40, H: 5, theta: 0 }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(chato.avisos.some(a => /H\/D/.test(a.texto))).toBe(true);
  });

  it('la altura media suma la mitad del remonte del techo cónico', () => {
    const r = analizarSilo({ datos: { ...base, theta: 30 }, sitio: SITIO, kd: 1.0, G: 0.85 });
    const remonte = 5 * Math.tan(30 * Math.PI / 180);
    expect(r.h).toBeCloseTo(20 + remonte / 2, 9);
  });

  it('el fondo sólo se calcula si el silo está elevado', () => {
    expect(analizarSilo({ datos: base, sitio: SITIO, kd: 1.0, G: 0.85 }).fondo).toBeNull();
    const elev = analizarSilo({ datos: { ...base, elevado: true, C: 8 },
      sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(elev.fondo).toHaveLength(2);
  });
});
