# proyecto_HC · Maquetas SIGESAPOL

Repositorio que reúne las maquetas de SIGESAPOL (Hospital Nacional PNP Luis N. Sáenz). Para verlas, abrir `index.html`. Todos los datos son ficticios.

| Carpeta | Módulo | Origen |
|---|---|---|
| `historia-clinica/` | Historia Clínica: solicitud y movimiento de HC, Unidad de Archivo | proyecto_HC original |
| `hemodialisis/` | Programa de Hemodiálisis (ver su `README.md`) | malh88/proyecto_hemodialisis_2 |
| `epidemiologia/` | Fichas de Epidemiología (ver su `README.md`) | malh88/proyecto_EPI |
| `comun/modulos.js` | Barra superior común con enlaces entre módulos | — |

Los módulos de hemodiálisis y epidemiología se incorporaron con `git subtree`, conservando su historial. Para traer cambios posteriores de esos repositorios:

```bash
git subtree pull --prefix=hemodialisis https://github.com/malh88/proyecto_hemodialisis_2 main
git subtree pull --prefix=epidemiologia https://github.com/malh88/proyecto_EPI main
```
