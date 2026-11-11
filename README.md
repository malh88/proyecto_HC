# Prototipo · Programa de Hemodiálisis · SIGESAPOL · Versión 3

El formato, los colores y las fichas son los del «Módulo Hemodiálisis SIGESAPOL» v2. Está hecho en HTML, CSS y JavaScript, sin librerías. Para verlo, abrir `index.html`. Todos los datos de ejemplo son ficticios.

## Flujo

1. **Bandeja (Módulo de Procedimientos Programados):** sin cambios. Al pulsar «Atender», NUEVA ATENCIÓN se ve como hoy en SIGESAPOL: receta, laboratorio, imagenología y atención origen.
2. **SERVICIO SOLICITANTE = NEFROLOGÍA** (procedimiento 90935 / 90937), en la misma opción «Atender»:
   - Si es la primera vez del paciente, se despliega en NUEVA ATENCIÓN, con el flag en SI, la ficha HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS (fichas 0026_01 y 0026_02), con datos autocompletados. Se llena una sola vez por paciente.
   - Al firmarla, se abre otra **ventana emergente**: **PROGRAMACIÓN DE TURNOS Y CITAS**.
   - Con otro servicio, sigue el proceso actual de SIGESAPOL, sin estas ventanas.
3. **Programación de turnos y citas (ventana):**
   - Grilla de máquinas × turnos, con el N° de citas editable.
   - **GUARDAR** (con confirmación) genera las citas y la atención Nº 13 queda ATENDIDA.
   - Al GUARDAR, PROGRAMACIÓN DE TURNOS Y CITAS pasa a ser una **pestaña** (opción) junto a las HIST., ya no una ventana emergente. Muestra solo las **CITAS GENERADAS**, con Atender / Continuar / Ver registro y Cambiar. La grilla y el formulario ya no se muestran.
   - Después de cada firma en la ventana de la cita, el sistema vuelve a esa pestaña.
4. **Columna Acciones de cada cita:**
   - **Atender:** abre una ventana emergente con el registro de la cita.
     - Primero, el médico llena y firma la **I.1 EVALUACIÓN INICIAL** (ficha 0026_03).
     - Con esa firma se habilita la nota en el Módulo de Enfermería.
     - Cuando la enfermera registra y firma, «Continuar» abre la ventana en el tiempo 2 con el resultado de enfermería. El botón **«Continuar EV. FINAL →»** (arriba y al final del resultado) pasa a la I.2.
     - Mientras enfermería no registra la nota, el botón **Continuar →** avisa que falta la nota. La ventana se actualiza sola cuando la enfermera guarda, también si lo hace en otra pestaña.
     - En esta ventana no se repiten el «Enlace con la cita programada» ni la franja de datos del paciente.
     - En la I.2, el médico puede registrar **medicamentos indicados al finalizar la sesión**: producto, dosis, vía, posología, días y cantidad. Se suman a PRODUCTOS MÉDICOS de NUEVA ATENCIÓN con origen «I.2 EVALUACIÓN FINAL».
     - Al firmarla, la cita queda ATENDIDA.
   - **Cambiar:** abre una ventana emergente para reprogramar la cita (fecha, turno, hora y máquina, con motivo).
5. **Módulo de Enfermería (EF) → Lista de pacientes de enfermería - Consulta Externa:**
   - Filtro de estado: PENDIENTES / REGISTRADOS.
   - Desde ☰ Detalles enfermería se abre «Nueva Nota Enfermería».
   - Si el paciente es de **NEFROLOGÍA / hemodiálisis**, la nota tiene la pestaña **EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS** (ficha 0026_04) junto a SIGNOS VITALES, ANTECEDENTES, CPMS/CPT y OBSERVACIONES.
   - En esa pestaña, la franja de datos del paciente muestra solo DNI, edad, procedencia, frecuencia, serología y acceso. El resto ya está en la cabecera de la nota.
   - Para otros servicios la nota queda como hoy, sin esa pestaña. Ejemplo: la fila de Cardiología.
5b. **NUEVO (Módulo de Enfermería):**
   - Abre la NOTA DE ENFERMERÍA - CONSULTA EXTERNA de un paciente nuevo. Se ingresa el DNI y se pulsa **BUSCAR CITA**:
     - **Paciente del Programa de Hemodiálisis (NEFROLOGÍA) con la I.1 firmada:** se abre la nota con la pestaña EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS.
     - **Sin la I.1 firmada:** aparece un aviso.
     - **Otro servicio:** se abre la nota estándar (SIGNOS VITALES, ANTECEDENTES, CPMS/CPT y OBSERVACIONES).
   - La ficha completa (EDITAR ATENCIÓN) se muestra vacía desde el inicio y se llena al buscar la cita.
   - Al firmar y GUARDAR, el sistema vuelve a la lista con estado **REGISTRADOS**, donde la nota aparece con su N°.
   - En REGISTRADOS, el botón ☰ abre el **DETALLE ENFERMERIA** con los datos que registró la enfermera, en solo lectura.
   - En PENDIENTES, el botón ☰ abre la nota para llenarla.
   - DNI de prueba (ficticios):
     - 40718235 y 40871236: hemodiálisis.
     - 41556677: Cardiología.
     - 41223399: Nefrología, biopsia renal.
     - 10457732: Cardiología.
6a. **HIST. ATENCIONES (Módulo de Procedimiento Programado):**
   - Al firmar la I.2 EVALUACIÓN FINAL, la atención de la cita queda guardada en esta pestaña: fecha, servicio, profesional y detalle.
   - El botón 👁 muestra los resultados:
     - **Datos de la atención:** profesionales y hora de cada tiempo.
     - **I.1:** CIE-10, funciones vitales, prescripción, receta y FUR.
     - **Evolución de enfermería.**
     - **I.2:** condición final, CPMS y medicamentos indicados.
   - También aparece la atención Nº 13, con la HC inicial y la programación de las citas.
6. **Resultados de enfermería en el Módulo de Procedimiento Programado:**
   - En el tiempo 2 de la sesión se muestra solo el resultado de la nota de la sesión, sin la tabla del historial.
   - El historial completo queda en la pestaña HIST. ENFERMERÍA, con el formato de HIST. ENFERMERIA de SIGESAPOL.
   - **HISTORIAL DE ENFERMERIA:** tabla con ID, servicio, tipo de atención, fecha y hora de ingreso, responsable y el botón 👁, que abre el **DETALLE ENFERMERIA**.
   - **DETALLE ENFERMERIA:** datos de la atención, del paciente, del responsable de enfermería y del responsable de atención. Pestañas en solo lectura: EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS, SIGNOS VITALES, ANTECEDENTES, CPMS/CPT y OBSERVACIONES.
   - Con el resultado de la nota de la sesión, el nefrólogo cierra la I.2.

Con otro servicio, o con Nefrología y otro procedimiento (Nº 14 Cardiología, Nº 15 biopsia renal), la atención queda como hoy (`atencion-otro.html`).

## Archivos

```
index.html           Módulo de Procedimientos Programados
atencion.html          Atención Nº 13: ventanas emergentes HC inicial y Programación de turnos y citas
atencion-sesion.html   Registro de una cita en 3 tiempos (se abre en ventana emergente desde «Atender»; ?modal=1)
atencion-otro.html     Procedimiento que no es de hemodiálisis (pantalla actual)
enfermeria.html        Lista de pacientes de enfermería - Consulta Externa + Detalles enfermería
enfermeria-nota.html   Nota de enfermería (con EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS solo para Nefrología)
registro-dia.html      Registro de atención del día
css/hemodialisis.css   Estilos de la v2 + reglas del prototipo
js/hemodialisis.js     Lógica
```

## Menú lateral

1. Solicitudes de atención · 2. Programación y citas · Enfermería (EF). Se retiró «Flujo propuesto». Por ahora se retiraron «Historia clínica inicial» y «Registro de atención del día».

## Flags de NUEVA ATENCIÓN

- **Interruptores NO / SI:** PRESCRIBIR RECETA, EXAMEN DE LABORATORIO y EXAMEN DE IMAGENOLOGÍA se activan con un interruptor NO / SI, como en SIGESAPOL.
- **Flag de la HC inicial:** con SERVICIO = NEFROLOGÍA y procedimiento 90935 / 90937 aparece además el flag **HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS**.
  - **Al activarlo (SI):** la ficha se despliega dentro de NUEVA ATENCIÓN, debajo del flag; ya no es ventana emergente. Con NO se oculta. En la primera atención el flag aparece en SI con la ficha desplegada.
  - **Al firmar la HC:** el flag queda en SI, bloqueado, con «firmada por…» y el botón «Ver».

## Exámenes de la HC inicial en EXAMEN DE LABORATORIO

- **Qué cambió en la HC:** ya no tiene «2.5 Exámenes de laboratorio» ni «III. Datos del médico».
- **Dónde están ahora los exámenes:** en la atención de primera vez (Nefrología, hemodiálisis), al activar EXAMEN DE LABORATORIO se cargan los exámenes de la HC inicial, uno por fila. Son estos: grupo sanguíneo, Hb, Hto, glucosa, depuración de creatinina, urea, creatinina, proteínas, albúmina, Ca, P, TGO, TGP, hierro, saturación de transferrina, PTH y la serología (lúes, AgHBs, AcHBs, AcHBc, AcHVC, HIV, HTLV-1 y COVID-19).
- **Qué muestra cada fila:** resultado, unidad, fecha, cantidad y diagnóstico.
  - Los que ya existen vienen del LABORATORIO o de ASEGURADOS, en solo lectura.
  - Los demás son MANUAL y se registran ahí.
- **Serología:** si AgHBs, AcHVC o HIV es POSITIVO, la serología del paciente queda POSITIVA y la programación solo ofrece la máquina de aislamiento.
- **Imagenología:** al activar EXAMEN DE IMAGENOLOGÍA se cargan la ecografía renal y la RX de tórax.

## Nota de enfermería (hemodiálisis)

- **Qué se quitó:** el «Enlace con la cita programada» y la franja de datos del paciente. Esos datos ya están en la cabecera de la nota.
- **Medicamentos aplicados:** además de «Marcar aplicado», la enfermera puede **agregar más medicamentos de la receta** (producto, dosis y vía). Quedan como aplicados, con la hora y la marca «agregado por enfermería», y se ven en el resultado del Módulo de Procedimientos.
- **Cierre de enfermería:** el campo «E. Observación final» ahora se llama **«E. Final»**.

## I.1 · 5.2 PRESCRIBIR RECETA

- **Qué cambió:** en la I.1 EVALUACIÓN INICIAL, el apartado «5.2 Medicamentos a administrar durante la sesión» se cambió por **5.2 PRESCRIBIR RECETA**, con flag NO / SI y el formato de SIGESAPOL.
- **Qué contiene:** el bloque PRODUCTOS MÉDICOS.
  - Datos generales: fecha de expedición, farmacia y paciente continuador.
  - Botón «Agregar Producto».
  - Tabla: producto, stock de farmacia, tiempo (días), vía, posología, cantidad, origen y quitar.
- **Validación:** al firmar la I.1 se exige la posología de cada producto. Lo prescrito pasa a la nota de enfermería y a PRODUCTOS MÉDICOS de NUEVA ATENCIÓN.

## GUARDAR con confirmación

- **GUARDAR → FINALIZAR (como en SIGESAPOL):** al confirmar GUARDAR en NUEVA ATENCIÓN, el registro queda **EN ESPERA DE LA FIRMA DEL MÉDICO** y el botón cambia a **FINALIZAR**. Al confirmar FINALIZAR, queda firmado. Vale para la HC inicial (Nº 13), las sesiones y las demás atenciones.
- **HC inicial:** ya no tiene botones propios. Al FINALIZAR se firma y se abre la Programación de turnos y citas.
- **Programación de turnos y citas:** termina con **CANCELAR / GUARDAR**. GUARDAR, con confirmación, genera las citas y guarda la atención Nº 13.
- **Mensaje de confirmación:** cada GUARDAR muestra el mismo mensaje directo, «¿Está seguro de guardar el registro?», con CANCELAR / SÍ, GUARDAR. Vale para NUEVA ATENCIÓN, la I.1, la I.2 y la nota de enfermería.
- **I.1 e I.2:** terminan con los botones **CANCELAR** y **GUARDAR**, en lugar de «Firmar…». CANCELAR cierra la ventana de la cita sin guardar.

## Perfiles y demostración

- **Perfil:** se elige con «Ver como». El nefrólogo firma la HC y los tiempos I.1 e I.2; la enfermería firma la nota.
- **Estado:** el avance se guarda en el navegador (localStorage) y se comparte entre pestañas. Así se puede tener una pestaña como nefrólogo y otra como enfermería. «↺ Reiniciar demostración» lo borra.
- **Perfil «Ver como»:** es propio de cada pestaña.

## Enfermería · NOTAS DE INGRESO ENFERMERIA
- En la lista (PENDIENTES y REGISTRADOS), el botón ☰ abre la ventana **NOTAS DE INGRESO ENFERMERIA** (formato SIGESAPOL): #, Fecha Atención, Hora Atención, Responsable (DNI, nombres, apellidos) y Detalle.
- Detalle: ✎ editar/registrar la nota · 👁 DETALLE ENFERMERIA (solo lectura) · 🗎 imprimir/PDF.
- En PENDIENTES la fila figura «por generar»: solo ✎ está activo (si el nefrólogo ya firmó la I.1); 👁 y PDF se activan al registrar la nota.

## Datos del paciente y datos generales de la atención (popups)
- PROGRAMACIÓN DE TURNOS Y CITAS y el popup de la cita (I.1 / I.2): se retiró la franja de paciente y la barra de pasos (1. Evaluación inicial · 2. Enfermería · 3. Evaluación final); en su lugar se muestran los recuadros **DATOS DEL PACIENTE** y **DATOS GENERALES DE LA ATENCIÓN** (formato SIGESAPOL; datos ficticios).
- El avance entre tiempos se hace con los botones GUARDAR y «Continuar EV. FINAL →».
- I.1: se retiró la fila final «Receta vale N° / FUR / CPMS de diálisis» (el CPMS 90937 queda por defecto).

## Resultado de enfermería en el popup de la cita
- Se retiró la fila de indicadores (PA, peso, UF efectiva, controles, eventos, medicamentos aplicados) del resultado de la nota de enfermería.
- Los datos de la enfermera (PROFESIONAL DE ENFERMERÍA: DNI / apellidos y nombres / CEP, y NOTA DE ENFERMERÍA: ID · fecha y hora) se muestran arriba, en DATOS GENERALES DE LA ATENCIÓN, cuando la nota está registrada.
- I.2: se retiró la fila de indicadores (UF, controles, eventos, medicamentos aplicados).
- La EVOLUCIÓN DE ENFERMERÍA (tiempo 2) muestra «Continuar EV. FINAL →» arriba y abajo; la I.2 tiene «← Ver evolución de enfermería» para volver a revisar la nota.

## Ajustes I.1 y nota de enfermería
- I.1 EVALUACIÓN INICIAL: se retiró el campo «Médico» (el nefrólogo figura en DATOS GENERALES DE LA ATENCIÓN).
- Nota de enfermería (hemodiálisis y estándar): GUARDAR (con confirmación) deja el registro EN ESPERA DE LA FIRMA y el botón pasa a FINALIZAR; FINALIZAR (con confirmación) firma la nota y regresa a la lista en REGISTRADOS.
- I.2 EVALUACIÓN FINAL: CANCELAR / GUARDAR (con confirmación) guarda el registro (sin mensaje adicional) y el botón pasa a FINALIZAR; FINALIZAR (con confirmación) firma, cierra la sesión y la cita queda ATENDIDA.

## Módulo de Procedimientos Programados · acciones
- PENDIENTE: Atender · Observar.
- ATENDIDO en espera de firma (GUARDAR sin FINALIZAR): Editar · Subir Informe · Solicitudes · Anular (sin Ver ni PDF, sin mensaje adicional).
- ATENDIDO firmado (FINALIZAR): Ver Atención · PDF · Subir Informe · Solicitudes · Anular.
- I.2: sin aviso de eventos en la cabecera y sin la línea «Firmado por …» al finalizar (los eventos siguen en el resultado de enfermería).
- NOTAS DE INGRESO ENFERMERIA: ✎ Editar solo aparece mientras la nota no está FINALIZADA (pendiente o guardada «falta FINALIZAR»); una vez finalizada solo quedan 👁 Ver y 🗎 PDF. Mismo criterio que en el Módulo de Procedimientos Programados (registro firmado: sin Editar).
- I.2: «Medicamentos indicados al finalizar» tiene el formato de RECETAS (como la 5.2 de la I.1): PRESCRIBIR RECETA (NO/SI) → PRODUCTOS MÉDICOS con Fec. expedición, Farmacia, Paciente continuador, «Agregar Producto» y tabla editable (producto, stock, tiempo, vía, posología, cantidad). Se guarda con la sesión y se ve en HIST. ATENCIONES.
- Atención FINALIZADA («Ver registro»): el popup muestra el RESUMEN COMPLETO en solo lectura, una sección tras otra: I.1 EVALUACIÓN INICIAL · EVOLUCIÓN DE ENFERMERÍA · I.2 EVALUACIÓN FINAL.

## MÓDULO DE GESTIÓN DE CITAS (CE) · citas múltiples para Nefrología (citas.html)
- Reemplaza la ventana emergente PROGRAMACIÓN DE TURNOS Y CITAS: se incorpora al módulo de citas existente de SIGESAPOL, manteniendo su formato (Información del paciente, Información de la prescripción y servicio, calendario, pestañas de historial, Programación Médica por médico/consultorio).
- **Cualquier paciente y servicio** (propuesta de mejora): TIPO DE PROGRAMACIÓN **Cita única** o **Citas múltiples**. Con citas múltiples se marcan varias fechas en el calendario y se elige un consultorio y horario libre en todas; CREAR genera todas las citas. Con NEFROLOGÍA y paciente del Programa de Hemodiálisis, las citas múltiples se programan por máquina y turno.
- NEFROLOGÍA + paciente con HC inicial del Programa de Hemodiálisis («Programa de hemodiálisis · citas múltiples»):
  - Los días se marcan en el calendario (clic en un día, o en LU/MA/MI… para marcar todo el mes; sin domingos ni fechas anteriores a la orden). La secuencia (L-M-V / Ma-J-S / personalizada), la vigencia y el N° de sesiones se generan solos en el resumen.
  - Programación Médica con el formato del SIGESAPOL: una tarjeta por máquina con Médico, Consultorio (175 - HEMODIÁLISIS), Máquina, Enfermera y Turno, y los horarios en bloques de 30 minutos («06:00 AM - 06:30 AM»…). Un clic en la hora de inicio selecciona un **rango de 4 horas**; el médico, la enfermera y el turno se completan según el horario elegido. Solo se permiten rangos libres en TODAS las fechas (ocupados, aislamiento por serología y turno sin nefrólogo bloqueados).
  - GUARDAR → confirmación con el formato de SIGESAPOL («¿Deseas guardar las N citas?» · Cancelar / Aceptar) → ficha **CITA** (formato SIGESAPOL: fecha, hora, servicio, consultorio, médico, tipo cita, secuencia, N° de sesiones, enfermera, DNI, nombre, parentesco, grado, correo, establecimiento) con la tabla de TODAS las citas seleccionadas; botones Nueva Cita (volver a modificar), Imprimir y FINALIZAR (confirmación) → crea las citas, guarda la atención Nº 13 y regresa a la atención.
  - Cita única (otros servicios): CREAR → «¿Deseas guardar la cita?» → ficha CITA con Nueva Cita / Imprimir.
- Flujo: HC inicial FINALIZAR → MÓDULO DE GESTIÓN DE CITAS (paciente y Nefrología precargados) → GUARDAR → FINALIZAR → atención Nº 13 ATENDIDA con sus citas.
- DNI de prueba: 40871236 (programa HD), 40718235 (programa vigente), 41556677 (Cardiología, cita única).

## Flujo con el Técnico de citas (30/10/2026)
Participantes: paciente, médico nefrólogo, enfermera y **Técnico de citas** (nuevo perfil en «Ver como»: Téc. R. QUISPE).
1. El paciente saca su primera cita (Registro de Cita) → Citas Médicas → el día de la cita es atendido; en NEFROLOGÍA se deriva a PROCEDIMIENTOS PROGRAMADOS.
2. Módulo de Procedimiento Programado (atención Nº 13): el médico llena la HISTORIA CLÍNICA INICIAL DE HEMODIÁLISIS (única vez) → GUARDAR → FINALIZAR. Con eso la atención Nº 13 queda ATENDIDA y firmada (ya no se programa desde la atención).
3. El **Técnico** registra las CITAS MÚLTIPLES en GESTIÓN DE CITAS (citas.html, solo perfil Técnico/Admisión). Al FINALIZAR, **cada cita llega al MÓDULO DE PROCEDIMIENTOS PROGRAMADOS como su propia atención** (Nº 22, 23, 24…; PENDIENTE · Atender / Observar).
4. Cada atención se atiende el día que corresponde: I.1 EVALUACIÓN INICIAL (médico) → EVOLUCIÓN DE ENFERMERÍA (Módulo de Enfermería) → I.2 EVALUACIÓN FINAL (médico, GUARDAR → FINALIZAR) → la atención pasa a HIST. ATENCIONES y en la bandeja queda ATENDIDO con Ver Atención / PDF.
- Se eliminó la pestaña PROGRAMACIÓN DE TURNOS Y CITAS (CITAS GENERADAS con Atender/Cambiar) del Módulo de Procedimiento Programado.

## Cambios recientes

- **Logo:** el encabezado de todas las pantallas usa el logo de SIGESAPOL (`img/logo-sigesapol.png`).
- **Página de entrada:** se eliminó «Flujo propuesto»; ahora `index.html` es la bandeja (Módulo de Procedimientos Programados), antes `bandeja.html`.
- **HC inicial (`atencion.html`):** el flag ya no muestra el texto «firmada por…». Al GUARDAR → FINALIZAR, la atención pasa a **HIST. ATENCIONES** (se abre esa pestaña), con el formato de SIGESAPOL: FECHA, HORA, ESTABLECIMIENTO, TIPO ATENCIÓN, SERVICIO, CONSULTORIO, MÉDICO y VER, con «Mostrar N registros», «Buscar» y paginación.
- **HIST. DE ATENCIONES P. PROGRAMADO:** muestra el «HISTORIAL DE INFORMES DE PROCEDIMIENTO PROGRAMADO» con las citas del paciente (citas múltiples o citas únicas, también las reprogramadas): Establecimiento, Nº de Doc, Servicio solicitante, Procedimiento solicitado, Fecha de atención, Médico y Ver atención.
- **Atención de la cita (`atencion-sesion.html`):** las fichas van en **NUEVA ATENCIÓN** (que mantiene su formato), cada una con su flag NO / SI: **I.1 EVALUACIÓN INICIAL**, **FICHA DE ENFERMERÍA** (solo lectura: lo que registró la enfermera) e **I.2 EVALUACIÓN FINAL**. Con la I.1 firmada se habilitan la ficha de enfermería y la I.2. El GUARDAR de NUEVA ATENCIÓN firma la I.1 y, cuando ya está la nota de enfermería, la I.2 (GUARDAR → FINALIZAR). HIST. DE ATENCIONES P. PROGRAMADO queda solo con el historial de citas y el enlace con la cita.
- **Enfermería (flujo de SIGESAPOL):** la enfermera inicia el registro, sin esperar la I.1. En la lista de pacientes de enfermería, ☰ de una cita pendiente (o NUEVO → DNI → BUSCAR CITA) abre **DETALLES ENFERMERIA**: DATOS PACIENTE y LISTADO DE CITAS (#, fecha y hora de la cita, fecha y hora de atención, consultorio, médico, Notas Enfermería y **Nueva Nota Enfermería**), que entra al llenado de la nota.
- **Botones CANCELAR · EDITAR · GUARDAR · FINALIZAR** en la nota de enfermería (`enfermeria-nota.html`) y en NUEVA ATENCIÓN de la cita (`atencion-sesion.html`, para la I.1 y luego la I.2). GUARDAR guarda y bloquea la ficha; recién entonces se habilitan EDITAR (la reabre para corregir y hay que volver a GUARDAR) y FINALIZAR (la firma). En la I.2, FINALIZAR exige que la enfermera ya haya registrado su nota.
- **NUEVA ATENCIÓN de la cita:** se quitó el bloque PRESCRIBIR RECETA / PRODUCTOS MÉDICOS suelto, porque la receta ya está dentro de la I.1 EVALUACIÓN INICIAL (5.2). Quedan EXAMEN DE LABORATORIO e IMAGENOLOGÍA. Al **GUARDAR** la I.1 (sin esperar a FINALIZAR) se habilitan la FICHA DE ENFERMERÍA y la I.2 EVALUACIÓN FINAL para su llenado.
- **Evaluaciones como pestañas:** en NUEVA ATENCIÓN de la cita, I.1 EVALUACIÓN INICIAL · FICHA DE ENFERMERÍA · I.2 EVALUACIÓN FINAL son pestañas (con su estado: PENDIENTE, GUARDADA, FIRMADA, REGISTRADA). Se ve una ficha a la vez; la ficha de enfermería y la I.2 se desbloquean al GUARDAR la I.1.
- **HIST. DE ATENCIONES P. PROGRAMADO es solo para ver:** ya no tiene «Atender». El 👁 muestra la atención registrada de la cita (solo lectura); si la cita aún no tiene atención, lo avisa. Las citas se atienden desde el Módulo de Procedimientos Programados.
