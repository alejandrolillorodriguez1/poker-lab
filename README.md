# Poker Lab

Simulador de **Texas Hold’em sin límite** para navegador y Android. Juegas contra entre 3 y 8 rivales de IA, con fichas ficticias y eliminación al quedarse sin fichas.

## Descargar la app Android

**[Descargar Poker Lab 1.4 para Android](downloads/Poker-Lab-1.4.apk?raw=true)**

Desde el teléfono, descarga el archivo y ábrelo desde **Archivos → Descargas** para instalarlo. Android puede pedir permiso para instalar desde la aplicación que abre el APK. Después aparecerá **Poker Lab** en la lista de aplicaciones.

Si ya tienes una versión anterior firmada con la misma clave, se instala como actualización. El juego, la IA y el jazz están incluidos; el APK no solicita permisos de internet, cámara, micrófono o archivos. No se ha probado en todos los dispositivos Android.

## Funciones

- Selección de rivales y fichas iniciales, nombre propio y ocho avatares.
- Estilos ocultos asignados al azar por mesa: selectivo-agresivo, conservador, activo-agresivo y equilibrado. Permanecen estables entre manos.
- Ajustes laterales de música jazz, volumen, animaciones y tiempo de turno (15, 30 o 60 segundos).
- Pasar, igualar, retirarse, subir y all-in; botes separados y empates.
- Animaciones de reparto y revelación de cartas, con ganador resaltado.
- Análisis estimado de decisiones al terminar la mano.

Las partidas no se guardan al cerrar o recargar. El tiempo de tu turno continúa si cambias de aplicación.

## Ejecutar en el ordenador

Requiere Node.js 18 o posterior. No hay dependencias que instalar.

```sh
git clone https://github.com/alejandrolillorodriguez1/poker-lab.git
cd poker-lab
npm start
```

Abre **http://127.0.0.1:8080**. La versión web incluye manifiesto e iconos de PWA; instalarla en un teléfono requiere un alojamiento HTTPS compatible. Este repositorio no activa hosting automáticamente.

Para generar un HTML autónomo y actualizar el contenido de la app Android:

```sh
npm run package:mobile
```

Se genera `dist/Poker-Lab-Android.html` y se actualiza `android/assets/index.html`. El archivo autónomo no instala una aplicación; el APK sí.

## Cómo juega la IA

Evalúa manos, estima equity con rangos ponderados por apuestas y compara el valor esperado de acciones legales. Usa 400–1.000 repartos y, en el river contra un único rival all-in, enumera las manos posibles. Los tamaños habituales de apuesta limitan los all-in desproporcionados del modelo simplificado.

Los perfiles modifican la selección de manos, la presión y la preferencia entre acciones rentables cercanas. La posición y las acciones públicas observadas durante la partida ajustan las estimaciones gradualmente. Una IA recibe sus propias cartas y perfil, **nunca las cartas ni los estilos reales de los adversarios**.

**Limitaciones:** son perfiles diseñados a mano, no modelos entrenados con partidas de profesionales ni un solver GTO. Los rangos y respuestas son aproximaciones; no se resuelve el árbol completo de apuestas futuras ni ICM. No garantiza juego óptimo ni resultados de entrenamiento.

## Pruebas

```sh
npm test
```

Incluyen comparación de 36.000 manos con un evaluador por combinaciones, botes separados, empates, conservación de fichas, temporizador, selección de apuestas, perfiles y acceso restringido a cartas ocultas. Las pruebas verifican las reglas y el modelo implementado; no demuestran superioridad frente a jugadores expertos.

## Compilar Android

El contenedor nativo es un `Activity` con `WebView`; sus recursos y código están en `android/`. Requiere Windows PowerShell, JDK 17, Android SDK Platform 35 y Build Tools 35.0.0.

1. Configura `JAVA_HOME` y `ANDROID_HOME` con esas herramientas.
2. Ejecuta `npm run package:mobile`.
3. Ejecuta `./scripts/build-android.ps1` desde PowerShell.

El resultado es `dist/Poker-Lab.apk`. La clave de firma original **no se publica**. El script genera una clave local de desarrollo si no indicas una; un APK con una clave distinta no puede actualizar la app distribuida aquí y requerirá desinstalarla primero. Guarda tu clave para tus futuras actualizaciones.

## Estructura

```text
web/          Interfaz, motor, estrategia, música y PWA
android/      Código Java, manifiesto y recursos del APK
scripts/      Servidor local, empaquetado y compilación
tests/        Pruebas del motor y comportamiento
downloads/    APK 1.4 ya firmado
docs/         Instrucciones de instalación
```

No se incluyen claves de firma, credenciales, herramientas descargadas ni metadatos privados del entorno de desarrollo. No se ha asignado una licencia de reutilización al proyecto.
