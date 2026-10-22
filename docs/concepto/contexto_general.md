# Proyecto: CodeWizards IDE

> Nota (22/10/2026, v1.1): documento de partida, anterior al estilo GBC y a la app local. Donde choque con `docs/agentes.md` o `auditorias/producto.md`, mandan estos: el estilo es GBC, el producto es una app local que usa las cuentas del usuario (sin Cloudflare Workers) y Copilot deja de ser gremio.

**Documento de Especificación de Arquitectura, Marca y Contexto (v3.2)**  
*Diseñado para la orquestación distribuida de LLMs y optimización de tokens por agentes multi-modelo[cite: 1].*

---

## 1. Visión General del Producto y Marca
**CodeWizards** (`codewizards.app`) es un entorno de desarrollo integrado (IDE) web multi-agente distribuido que transforma la monitorización y gestión de pipelines de desarrollo de software en un videojuego de simulación y gestión de recursos en perspectiva isométrica[cite: 1].

### 🏷️ Filosofía, Manifiesto y Copys de Marca
* **Dominio Oficial:** `codewizards.app`[cite: 1]
* **Eslogan Principal:** *"Do not vibecode. Spellcode."*[cite: 1]
* **Enfoque de Marca:** Posicionamiento crítico contra el *vibecoding* (tirar prompts masivos a ciegas sin estructura ni control). En CodeWizards, el desarrollo se aborda mediante ingeniería de software estructurada, donde cada acción de un agente de IA es un "hechizo" preciso, auditado y optimizado[cite: 1].

#### 📜 Colección de Frases & Conceptos (Landing, Tooltips y Modales)
* **Sobre la Magia y la IA:**
  * *"Nowadays AI seems like magic... that's because it truly is."*
  * *"Any sufficiently advanced technology is indistinguishable from magic. We just added the spellbook."*
  * *"Today’s AI looks like magic. That’s because you haven’t tuned your grimoire yet."*
* **Humor Dev & Control de Tokens:**
  * *"Stop throwing prompts into the void. Start chanting with structure."*
  * *"Magia negra es pushear a producción un viernes. Aquí hacemos alquimia de tokens."*
  * *"Debugging is just reverse-engineering someone else’s spells."*

---

## 2. Dirección Visual y Estética RPG Isométrica

### 🎨 Estilo Artístico: *16-Bit SNES Dark Fantasy*
* **Identidad Visual:** Pixel art detallado inspirado en los RPG clásicos de 16 bits (*Chrono Trigger*, *Final Fantasy Tactics*, *Tactics Ogre*). Paletas de colores sobrias, tonos piedra, pergamino envejecido, maderas oscuras y azul medianoche, contrastados con vívidos efectos de partículas arcanas (fuego, hielo, runas luminosas).
* **Sensación de Usuario:** Atmósfera madura y técnica que transmite seriedad y control absoluto sobre los sistemas, alejándose de estéticas infantiles o demasiado casuales.

---

## 3. Core Mecánico, UX y Sistema de Gremios (Guilds)

### 🛡️ Sistema de Gremios por Proveedor de IA
El color temático de cada mago y su indumentaria se vincula directamente al ecosistema o proveedor del modelo subyacente a modo de "Gremio":
* **Anthropic (Claude):** Naranja óxido / Ámbar arcano.
* **OpenAI (GPT):** Azul corporativo / Cian profundo.
* **Google (Gemini):** Rojo carmesí / Fuego estelar.
* **DeepSeek:** Índigo nocturno / Azul cobalto.
* **Qwen (Alibaba):** Verde esmeralda / Jade antiguo.
* **GitHub Copilot:** Turquesa / Cian eléctrico.
* **Meta (Llama):** Púrpura místico / Violeta void.

### 🧙‍♂️ Anatomía y Atributos de los Magos (Rangos por Potencia)
Los rangos definen la potencia y complejidad del modelo asignado:
  1. **Aprendiz:** Modelos ligeros/rápidos (ej. Gemini Flash, Llama 8B). Túnica sencilla y desgastada, barba corta, bastón de madera simple.
  2. **Mago Joven:** Modelos intermedios. Túnicas bordadas, bastón pulido con esfera de energía estable.
  3. **Gran Sabio:** Modelos avanzados de razonamiento profundo (ej. Claude Sonnet, o1). Túnicas ornamentadas con runas, barba larga, bastón arcano con efectos de partículas y grimorio flotante.
  4. **Mago Jefe (Archmage - Único):** El director de orquestación global. Levitando sobre un círculo rúnico en el suelo, corona arcana, bastón de mando supremo.

### 🎬 Animaciones y Estados (Ciclo de Trabajo)
Sprites diseñados para **8 direcciones de movimiento** (perspectiva isométrica)[cite: 1]:
* **Caminando:** Se desplazan por la estancia con los brazos cruzados a la espalda[cite: 1].
* **Búsqueda y Lectura (Librería):** Acuden a la **Librería** agitando rítmicamente su bastón sobre tomos de contexto[cite: 1].
* **Escritura y Entregables (Pizarra):** Redactan código y artefactos apuntando con su bastón en la **Pizarra**[cite: 1].

---

## 4. Infraestructura y Redes (Cloudflare Edge)
* **Cloudflare Workers:** Microservicios serverless en el Edge para orquestar APIs de agentes, colas de tareas y lógica del sistema con escalado instantáneo a cero[cite: 1].
* **Cloudflare Pages:** Frontend web alojado y desplegado automáticamente vía CI/CD con GitHub[cite: 1].
* **Email Routing:** Redirección estricta de cuentas oficiales (ej. `staff@codewizards.app`) al buzón del administrador (`buzón del administrador`)[cite: 1]. Catch-all desactivado.
* **Seguridad:** HSTS forzado nativo por la TLD `.app`. Entornos locales (`localhost`) bajo HTTPS mediante `mkcert` / Caddy[cite: 1].

---

## 5. Arquitectura del Sistema (Backend & Agentes)
El backend opera como un **Event Sourcing Manager** y un sistema de ficheros virtual aislado por tareas[cite: 1]:
1. **Mago Director (Intention Router):** Agente económico que clasifica requerimientos y decide si delega en un Aprendiz o invoca a un Gran Sabio[cite: 1].
2. **Pizarrón y Librería:** Canal secuencial de trabajo validado antes de aplicarse al código base en producción[cite: 1].

---

## 6. Estrategia de Optimización, Ahorro de Tokens y Compresión de Prompts
* **Inglés Nativo como Puente:** Traducción automática de prompts del usuario de español a inglés técnico denso para maximizar la compresión de tokenizadores (TikToken/Anthropic)[cite: 1].
* **Técnicas de Compresión a Investigar por el Modelo:**
  * *Caveman Syntax:* Reducción de prompts para Aprendices a sintaxis conceptual directa (ahorro de hasta un 30% en tokens de entrada)[cite: 1].
  * *Bridge Prompting & LLMLingua:* Algoritmos selectivos para eliminar redundancias contextuales sin perder semántica clave.
  * *AST Summarization:* Compresión de estructuras de código mediante árboles de sintaxis abstracta antes de pasarlas como contexto al LLM.
  * *Context Flushing:* Cierre estricto de hilos al completar subtareas para evitar relecturas innecesarias del historial[cite: 1].

---

## 7. Nota de Iteración y Libertad Creativa (Para Modelos e IAs Futuras)
> **Aviso Importante:** Todo lo especificado en este documento **no es definitivo**. Este documento actúa como una base conceptual viva y abierta a la evolución. Cualquier modelo de IA avanzado que retome el desarrollo, la arquitectura o el diseño de este proyecto tiene **total libertad, autonomía y se le anima activamente** a proponer nuevas mejoras, refactorizar componentes, rediseñar la estética, optimizar flujos o plantear soluciones técnicas y creativas superiores si considera que mejoran el rendimiento o la visión general del producto.