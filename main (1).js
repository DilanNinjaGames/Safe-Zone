/* ════════════════════════════════════════════════════════════
   SAFEZONE — main.js
   Motor de juego: cuestionario, batalla, historia narrativa,
   bestiario interactivo, menús de ACT / ITEM, modal de pánico.
   ════════════════════════════════════════════════════════════ */

const Game = (() => {

    /* ══════════════════════════════════════════
       ESTADO GLOBAL
    ══════════════════════════════════════════ */
    const state = {
        screen:       'intro',
        quizScore:    0,
        playerLevel:  1,
        playerHp:     20,
        playerMaxHp:  20,
        enemyHp:      0,
        enemyMaxHp:   0,
        battleTurn:   0,
        battleEnemy:  null,
        mercyCount:   0,
        helpCharge:   0,   // % cargado del botón PIEDAD (jefe)
        shieldActive: false,
        storyNode:    'start',
        inventory: [
            { id: 'hablar',   name: 'HABLAR CON ALGUIEN', heal: 5,  desc: 'Le contaste a una persona de confianza. Tu corazón recupera fuerzas.' },
            { id: 'reportar', name: 'REPORTAR CUENTA',    heal: 3,  desc: 'Reportaste el contenido abusivo. Sientes que hiciste lo correcto.' },
            { id: 'bloquear', name: 'BLOQUEAR CONTACTO',  heal: 4,  desc: 'Bloqueaste al agresor. El silencio trae alivio.' },
            { id: 'captura',  name: 'GUARDAR CAPTURA',    heal: 2,  desc: 'Documentaste las pruebas. +Escudo de Evidencia.' },
        ],
    };

    /* ══════════════════════════════════════════
       PREGUNTAS DEL CUESTIONARIO
    ══════════════════════════════════════════ */
    const questions = [
        { text: '¿Con qué frecuencia usas redes sociales?',
          opts: [{ label:'Nunca', val:0 }, { label:'Algunas veces', val:1 }, { label:'Todos los días', val:2 }, { label:'Muchas horas al día', val:3 }] },
        { text: '¿Has visto a alguien ser insultado o atacado en internet?',
          opts: [{ label:'Nunca', val:0 }, { label:'Una vez', val:1 }, { label:'Varias veces', val:2 }, { label:'Muy seguido', val:3 }] },
        { text: '¿Alguna vez alguien te ha insultado o burlado de ti en internet?',
          opts: [{ label:'Nunca', val:0 }, { label:'Una vez', val:1 }, { label:'Algunas veces', val:2 }, { label:'Muchas veces', val:3 }] },
        { text: '¿Alguna persona te envía mensajes molestos o agresivos repetidamente?',
          opts: [{ label:'Nunca', val:0 }, { label:'Ocasionalmente', val:1 }, { label:'Frecuentemente', val:2 }, { label:'Muy frecuentemente', val:3 }] },
        { text: '¿Alguna vez alguien publicó algo tuyo sin tu permiso?',
          opts: [{ label:'Nunca', val:0 }, { label:'Una vez', val:1 }, { label:'Varias veces', val:3 }] },
        { text: '¿Alguien ha difundido mentiras o rumores sobre ti en internet?',
          opts: [{ label:'Nunca', val:0 }, { label:'Creo que sí', val:1 }, { label:'Sí, varias veces', val:3 }] },
        { text: '¿Alguna vez alguien te ha amenazado por internet?',
          opts: [{ label:'Nunca', val:0 }, { label:'Una vez', val:2 }, { label:'Varias veces', val:4 }] },
        { text: '¿Alguien ha intentado obligarte a hacer algo usando presión o amenazas?',
          opts: [{ label:'Nunca', val:0 }, { label:'Tal vez', val:2 }, { label:'Sí', val:4 }] },
        { text: '¿Alguna persona desconocida intentó ganar tu confianza muy rápido o pedirte cosas personales?',
          opts: [{ label:'Nunca', val:0 }, { label:'Sí, pero lo ignoré', val:1 }, { label:'Sí, varias veces', val:3 }] },
        { text: '¿Alguna vez alguien publicó tu número, dirección u otra información personal sin permiso?',
          opts: [{ label:'Nunca', val:0 }, { label:'Sí', val:5 }] },
    ];
    let currentQ = 0;

    /* ══════════════════════════════════════════
       ENEMIGOS POR NIVEL
       Cada enemigo tiene:
         - acts[]:  acciones de ACTUAR con efecto shield/win
         - dialogues[]: frases que dice al atacar
    ══════════════════════════════════════════ */
    const enemies = {
        1:  { name:'CURIOSIDAD\nTÓXICA',    hp:15,  atk:2,  color:'#00ff00', sprite:'slime',
              msg:'* Un comentario extraño aparece en tu pantalla...',
              dialogues:["¿Solo una mirada, no?", "No es para tanto..."],
              acts:[
                { name:'Ignorar',   text:'* Te alejas de la pantalla. El troll se aburre.',     shield:false, win:false },
                { name:'Bloquear',  text:'* Bloqueas la cuenta. ¡Paz instantánea!',              shield:false, win:true  },
              ]},
        2:  { name:'TESTIGO\nSILENCIOSO',   hp:20,  atk:3,  color:'#88ff00', sprite:'ghost',
              msg:'* Ves cómo atacan a alguien. ¿Harás algo?',
              dialogues:["No es asunto tuyo...", "Mirar sin actuar también duele."],
              acts:[
                { name:'Mirar y callar', text:'* Bajas la cabeza. La culpa pesa más.',           shield:false, win:false },
                { name:'Reportar',       text:'* Reportas el contenido abusivo. El sistema actúa.', shield:true, win:false },
              ]},
        3:  { name:'INSULTO\nDIGITAL',      hp:30,  atk:5,  color:'#ffcc00', sprite:'eye',
              msg:'* Las palabras duelen aunque sean letras.',
              dialogues:["Solo era una broma, ¿acaso no aguantas nada?", "Es humor negro, búscalo."],
              acts:[
                { name:'Ignorar',   text:'* Intentas mirar a otro lado. Funciona un poco.',     shield:false, win:false },
                { name:'Razonar',   text:'* Intentas explicarle tus sentimientos. Se ríe más fuerte.', shield:false, win:false },
                { name:'Bloquear',  text:'* Has bloqueado al usuario. Sientes una inmensa paz. ¡Ganaste!', shield:false, win:true },
              ]},
        4:  { name:'ACOSADOR\nPERSISTENTE', hp:45,  atk:8,  color:'#ff9900', sprite:'spider',
              msg:'* Mensajes, mensajes, mensajes... sin parar.',
              dialogues:["No puedes escapar de mí.", "Siempre estaré aquí."],
              acts:[
                { name:'Responder',    text:'* Le contestas. Se intensifica.',                   shield:false, win:false },
                { name:'Documentar',   text:'* Guardas capturas. El enemigo se pone nervioso.', shield:true,  win:false },
                { name:'Denunciar',    text:'* Denuncias a la plataforma. Se reduce su poder.', shield:false, win:false },
              ]},
        5:  { name:'LADRÓN\nDE DATOS',      hp:50,  atk:10, color:'#ff6600', sprite:'thief',
              msg:'* Tu foto aparece donde no debería estar.',
              dialogues:["Lo que subes a la red, es mío.", "Demasiado tarde para borrarlo."],
              acts:[
                { name:'Pedir que borre', text:'* Le pides amablemente que borre la foto. Te ignora.', shield:false, win:false },
                { name:'Reportar cuenta', text:'* Reportas la publicación. ¡El monstruo se debilita!', shield:true,  win:false },
              ]},
        6:  { name:'DIFAMADOR',             hp:60,  atk:13, color:'#ff4400', sprite:'shadow',
              msg:'* Mentiras se propagan como virus.',
              dialogues:["Todos van a creerme a mí.", "Tu reputación ya no importa."],
              acts:[
                { name:'Desmentir públicamente', text:'* Publicas la verdad. Algunos te creen.',      shield:false, win:false },
                { name:'Asesoría legal',          text:'* Buscas asesoría legal. El difamador tiembla.', shield:true, win:false },
              ]},
        7:  { name:'AMENAZA\nGRAVE',        hp:70,  atk:17, color:'#ff2200', sprite:'demon',
              msg:'* "Sé dónde vives." — dice el mensaje.',
              dialogues:["No son solo palabras.", "El miedo es tu peor enemigo."],
              acts:[
                { name:'Responder al agresor', text:'* Es una trampa. Te expones más.',              shield:false, win:false },
                { name:'Llamar al 110',         text:'* La Policía interviene. El agresor retrocede.', shield:true, win:false },
              ]},
        8:  { name:'SEXTORSIÓN\n⚠',         hp:80,  atk:22, color:'#ff0044', sprite:'boss1',
              msg:'* Un chantaje aparece. El corazón late fuerte.',
              dialogues:["Si no haces lo que digo, todos verán esas fotos.", "El tiempo corre. Tick. Tock."],
              acts:[
                { name:'Ceder al chantaje', text:'* Intentas negociar. Pide más cosas.',             shield:false, win:false },
                { name:'Guardar pruebas',   text:'* Capturas las amenazas. ¡Escudo de Evidencia!',   shield:true,  win:false },
                { name:'Llamar a la ATIC',  text:'* Denuncias en atic.policia.bo. Gran daño al jefe.', shield:true, win:false },
              ]},
        9:  { name:'MANIPULADOR\nOCULTO',   hp:85,  atk:20, color:'#cc00ff', sprite:'mask',
              msg:'* Parece amable. Algo no cuadra.',
              dialogues:["Confía en mí, soy el único que te entiende.", "¿Qué te cuesta enviarme esa foto?"],
              acts:[
                { name:'Confiar',          text:'* Bajas la guardia. El manipulador avanza.',        shield:false, win:false },
                { name:'Hablar con adulto', text:'* Le cuentas a un adulto de confianza. El manipulador huye.', shield:true, win:true },
              ]},
        10: { name:'DOXXER\n— JEFE —',      hp:999, atk:35, color:'#ff0000', sprite:'final',
              msg:'* ¡TUS DATOS ESTÁN EN TODAS PARTES!\n* Un ataque ineludible. Necesitas cargar tu PIEDAD.',
              dialogues:["¿Crees que apagar el router te salvará?", "Ya sé tu dirección. Conozco tu rutina.", "Eres solo un archivo de texto en mi base de datos.", "¡Nadie va a venir! ¡Estás solo en la red!"],
              acts:[
                { name:'Guardar Captura', text:'* Recolectas evidencia crucial. +Escudo de Evidencia.', shield:true,  win:false },
                { name:'Suplicar',        text:'* Le ruegas que se detenga. El Doxxer se alimenta de tu miedo.', shield:false, win:false },
              ]},
    };

    /* ══════════════════════════════════════════
       MENSAJES DE APOYO
    ══════════════════════════════════════════ */
    const supportMessages = {
        low:  'Lo que sientes es válido. Navegar en internet puede ser difícil, pero existen herramientas para protegerte. ¡Tú tienes el poder de cuidarte!',
        mid:  'No estás solo/a en esto. Muchas personas pasan por situaciones similares. Hablar con alguien de confianza puede ser el primer paso más importante que des hoy.',
        high: 'Lo que describes es serio y no es tu culpa. Mereces apoyo real. Por favor comunícate con las líneas de ayuda: son gratuitas, confidenciales y están para ti.',
        boss: '¡Esto es una emergencia digital! Por favor busca ayuda ahora mismo. Las líneas de apoyo listadas abajo pueden orientarte legalmente y emocionalmente. ¡No enfrentes esto solo/a!',
    };

    /* ══════════════════════════════════════════
       HISTORIA NARRATIVA
    ══════════════════════════════════════════ */
    const storyNodes = {
        start: {
            text: '* Estás en tu habitación.\n* Son las 10 PM. Tu celular vibra con una notificación.',
            choices: [
                { label: '📵 Ignorar el mensaje', next: 'ignore1', route: 0 },
                { label: '👀 Leer el mensaje',    next: 'see1',    route: 1 },
            ]
        },
        // ── RUTA 0 (ignorar) ──
        ignore1: {
            text: '* Decides ignorarlo. Ya lo verás mañana.\n* Al día siguiente, tu amigo en la escuela se ve distante, ojeroso y no habla con nadie.',
            choices: [
                { label: '🚶 No hacer nada',   next: 'ignore2',       route: 0 },
                { label: '💬 Acercarte a él',  next: 'involve_friend', route: 1 },
            ]
        },
        ignore2: {
            text: '* Pasas de largo. Después te enteras de que tu amigo cerró todas sus cuentas.\n* Nadie supo que podría haber recibido ayuda.',
            choices: [{ label: '➡ Ver el final', next: 'end_silence', route: 0 }]
        },
        end_silence: {
            text: '★ FINAL: EL SILENCIO TIENE COSTO\n\n* No hiciste nada.\n* Tu amigo nunca supo que podías haberle ayudado.\n* A veces, una sola pregunta puede salvar a alguien.',
            choices: [], isEnd: true, endType: 'bad',
        },
        // ── RUTA 1 (involucrarse) ──
        see1: {
            text: '* Lees el mensaje: "¿Puedes hablar? Necesito ayuda."\n* No dice por qué. Sientes que es urgente.',
            choices: [
                { label: '🙈 No responder',   next: 'ignore1',    route: 0 },
                { label: '📱 Llamarle ahora', next: 'call_friend', route: 1 },
            ]
        },
        call_friend: {
            text: '* Tu amigo te explica: está en un grupo agresivo de internet. Ha recibido amenazas por una discusión trivial.',
            choices: [
                { label: '😶 No sé qué hacer...', next: 'do_nothing_mid', route: 0 },
                { label: '🛡 Ayudarle',           next: 'help1',          route: 1 },
            ]
        },
        do_nothing_mid: {
            text: '* No actúas.\n* Tu amigo se queda solo frente a las amenazas.\n* Al final, lo encuentras bloqueado en todas partes.',
            choices: [{ label: '↩ Volver a intentarlo', next: 'call_friend', route: 0 }]
        },
        help1: {
            text: '* Escribes con educación al administrador del grupo, pidiendo que baneen a los agresores.\n* El administrador se burla de ti y te expone en el grupo.',
            choices: [{ label: '➡ Continuar', next: 'exposed', route: 1 }]
        },
        exposed: {
            text: '* Recibes insultos e intimidaciones de varios usuarios.\n* Sientes miedo y tristeza.\n\n⚠ ENCUENTRO: EL MIEDO TOMA FORMA',
            choices: [{ label: '⚔ Enfrentar al monstruo', next: 'battle_lv3', route: 1, battle: 3 }]
        },
        battle_lv3: {
            text: '* Superaste el miedo inicial.\n* Decides actuar de otra forma: defiendes públicamente a tu amigo y documentas todo.',
            choices: [{ label: '➡ Continuar', next: 'doxx_threat', route: 1 }]
        },
        doxx_threat: {
            text: '* Alguien filtra tu nombre, tu colegio y tu ciudad en el grupo.\n\n⚠ ENCUENTRO: LA DUDA TE CONSUME',
            choices: [{ label: '⚔ Enfrentar al monstruo', next: 'battle_lv5', route: 1, battle: 5 }]
        },
        battle_lv5: {
            text: '* Resististe.\n* Reportas el grupo a la plataforma junto a tu amigo.\n* Llaman a la Defensoría del Pueblo.',
            choices: [{ label: '➡ Ver el final', next: 'end_good', route: 1 }]
        },
        end_good: {
            text: '★ FINAL: LA DETERMINACIÓN LO PUEDE TODO\n\n* El grupo fue eliminado de la plataforma.\n* Tu amigo no enfrenta más amenazas.\n* Tu valentía marcó la diferencia.\n\n❤ "No estás solo. Nunca lo estuviste."',
            choices: [], isEnd: true, endType: 'good',
        },
        involve_friend: {
            text: '* Te acercas a tu amigo en el recreo. "¿Estás bien?"\n* Él duda, luego te cuenta todo.',
            choices: [{ label: '➡ Escuchar', next: 'call_friend', route: 1 }]
        },
    };

    /* ══════════════════════════════════════════
       SPRITES PIXEL (canvas 80×80, celda = 5px)
    ══════════════════════════════════════════ */
    function drawSprite(canvas, type, color) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 80, 80);
        const c = color || '#FF0000';
        const px = (x, y, w, h, col) => { ctx.fillStyle = col || c; ctx.fillRect(x*5, y*5, (w||1)*5, (h||1)*5); };

        if (type === 'slime') {
            [[3,10],[1,14],[0,16],[0,16],[0,14],[1,10],[3,6]].forEach(([x,w],y) => px(x, y+4, w, 1));
            px(4,6,2,2,'#000'); px(9,6,2,2,'#000'); px(5,7,1,1,'#FFF'); px(10,7,1,1,'#FFF');
        } else if (type === 'ghost') {
            [[4,8],[2,12],[1,14],[1,14],[1,14],[2,12],[4,8]].forEach(([x,w],y) => px(x,y+2,w,1));
            px(4,5,3,3,'#000'); px(9,5,3,3,'#000'); px(5,6,1,1,'#FFF'); px(10,6,1,1,'#FFF');
            for(let i=0;i<4;i++) px(2+i*3,9,2,2,'#000');
        } else if (type === 'eye') {
            px(4,1,8,2); px(2,3,12,6); px(1,5,14,4); px(2,9,12,2); px(4,11,8,2);
            px(5,4,6,5,'#000'); px(6,5,4,3,'#FFF'); px(7,6,2,2,'#000');
        } else if (type === 'spider') {
            px(5,5,6,6); [[0,3],[0,5],[0,7],[11,3],[11,5],[11,7]].forEach(([x,y]) => px(x,y,5,1));
            px(6,6,2,2,'#000'); px(9,6,2,2,'#000');
        } else if (type === 'thief') {
            px(4,1,8,8); px(3,5,2,3,'#000'); px(11,5,2,3,'#000'); px(5,9,6,1,'#000');
            px(2,9,12,5); px(0,10,3,3); px(13,10,3,3); px(5,14,3,2); px(8,14,3,2);
        } else if (type === 'shadow') {
            for(let y=0;y<16;y++){const w=Math.round(4+Math.sin(y*.7)*4); px(Math.round(8-w/2),y,w,1);}
        } else if (type === 'demon') {
            px(3,0,2,3); px(11,0,2,3); px(4,2,8,8);
            px(3,6,2,2,'#FF0'); px(11,6,2,2,'#FF0');
            px(5,9,6,1,'#000'); px(6,8,1,1); px(9,8,1,1);
            px(3,10,10,5); px(0,11,3,4); px(13,11,3,4);
        } else if (type === 'boss1') {
            px(3,0,2,2,'#FF0'); px(7,0,2,2,'#FF0'); px(11,0,2,2,'#FF0'); px(2,2,12,2,'#FF0');
            px(3,4,10,8); px(4,6,3,3,'#000'); px(9,6,3,3,'#000'); px(5,10,6,1,'#000'); px(2,12,12,3);
        } else if (type === 'mask') {
            px(4,1,8,10,'#FFF'); px(4,1,4,10); px(5,4,2,2,'#000'); px(9,4,2,2,'#000'); px(6,8,4,1,'#000');
        } else { // final boss
            for(let i=0;i<3;i++) px(2+i*4,0,3,2,'#FF0');
            px(1,2,14,12); px(2,4,4,4,'#000'); px(10,4,4,4,'#000');
            px(3,5,2,2,'#F00'); px(11,5,2,2,'#F00'); px(4,10,8,2,'#000');
            px(5,11,2,1,'#FFF'); px(9,11,2,1,'#FFF'); px(0,14,4,2); px(12,14,4,2);
        }
    }

    /* ══════════════════════════════════════════
       HELPERS DOM
    ══════════════════════════════════════════ */
    const show = id => { const el = document.getElementById(id); if(el) el.style.display = 'block'; };
    const hide = id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; };
    const scrollToGame = () => document.getElementById('juego').scrollIntoView({ behavior:'smooth', block:'start' });

    function scoreToLevel(s) {
        if(s<=5)  return 1; if(s<=8)  return 2; if(s<=12) return 3;
        if(s<=16) return 4; if(s<=20) return 5; if(s<=24) return 6;
        if(s<=28) return 7; if(s<=32) return 8; if(s<=36) return 9;
        return 10;
    }
    function levelToSeverity(lv) {
        if(lv<=2) return 'low'; if(lv<=5) return 'mid'; if(lv<=8) return 'high'; return 'boss';
    }

    /* Barras de HP */
    function setPlayerHp(hp, max) {
        state.playerHp = Math.max(0, Math.min(max, hp));
        const pct = Math.round((state.playerHp / max) * 100);
        const fill = document.getElementById('playerHpFill');
        const nums = document.getElementById('playerHpNums');
        if(fill){ fill.style.width = pct+'%'; fill.style.background = pct>50?'var(--green)':pct>25?'var(--mid)':'var(--red)'; }
        if(nums) nums.textContent = state.playerHp + ' / ' + max;
    }
    function setEnemyHp(hp, max) {
        state.enemyHp = Math.max(0, Math.min(max, hp));
        const pct = Math.round((state.enemyHp / max) * 100);
        const fill = document.getElementById('enemyHpFill');
        if(fill){ fill.style.width = pct+'%'; fill.style.background = pct>50?'var(--green)':pct>25?'var(--mid)':'var(--red)'; }
    }

    function disableActionBtns() { document.querySelectorAll('.act-btn').forEach(b => b.disabled = true); }
    function enableActionBtns()  { document.querySelectorAll('.act-btn').forEach(b => b.disabled = false); }

    /* Typewriter — cancela el intervalo anterior antes de iniciar uno nuevo.
       Sin esto, múltiples llamadas simultáneas intercalan caracteres en el mismo
       elemento produciendo texto ilegible (el bug visible en las batallas). */
    function typewrite(el, text, speed = 25, cb) {
        clearInterval(el._twInterval);      // ← cancela cualquier typewriter activo en este elemento
        el.innerHTML = '';
        el.classList.add('typewriter');
        const chars = [...text];            // spread: itera codepoints, no bytes (fix para tildes/emoji)
        let i = 0;
        el._twInterval = setInterval(() => {
            const ch = chars[i];
            if (ch === '\n') {
                el.appendChild(document.createElement('br'));
            } else {
                el.appendChild(document.createTextNode(ch));
            }
            if (++i >= chars.length) {
                clearInterval(el._twInterval);
                el._twInterval = null;
                el.classList.remove('typewriter');
                if (cb) cb();
            }
        }, speed);
    }

    /* Barra de carga de PIEDAD (para el DOXXER) */
    function updateMercyCharge() {
        const pct = Math.min(state.helpCharge, 100);
        const fill  = document.getElementById('mercyChargeFill');
        const label = document.getElementById('mercyChargeLabel');
        const btn   = document.getElementById('btnMercy');
        const wrap  = document.getElementById('mercyChargeWrap');

        if(wrap) wrap.style.display = 'block';
        if(fill) fill.style.width = pct + '%';

        if(pct >= 100){
            if(label) label.textContent = '¡PIEDAD LISTA!';
            if(btn){ btn.disabled = false; btn.classList.add('charged'); btn.textContent = '❤ ¡PEDIR AYUDA!'; }
        } else {
            if(label) label.textContent = `PIEDAD: cargando (${pct}%)`;
            if(btn){ btn.disabled = true; btn.classList.remove('charged'); btn.textContent = `🕊 PIEDAD (${pct}%)`; }
        }
    }

    /* ══════════════════════════════════════════
       CUESTIONARIO
    ══════════════════════════════════════════ */
    function startQuestionnaire() {
        state.quizScore = 0; currentQ = 0;
        hide('screen-intro'); show('screen-quiz');
        renderQuestion(); scrollToGame();
    }

    function renderQuestion() {
        const q   = questions[currentQ];
        const pct = Math.round(((currentQ+1) / questions.length) * 100);
        document.getElementById('qProgress').textContent = `Pregunta ${currentQ+1} / ${questions.length}`;
        document.getElementById('qBar').style.width = pct + '%';
        document.getElementById('qSteps').innerHTML = `
            <div class="q-step active">
                <p class="q-question">* <span>${q.text}</span></p>
                <div class="game-choices">
                    ${q.opts.map(o => `<button class="game-choice" onclick="Game.answerQ(${o.val})">❤ ${o.label}</button>`).join('')}
                </div>
            </div>`;
    }

    function answerQ(val) {
        state.quizScore += val;
        if(++currentQ >= questions.length) finishQuestionnaire();
        else renderQuestion();
    }

    function finishQuestionnaire() {
        const lv = scoreToLevel(state.quizScore);
        state.playerLevel = lv;
        hide('screen-quiz');
        startBattle(lv, levelToSeverity(lv));
    }

    /* ══════════════════════════════════════════
       BATALLA
    ══════════════════════════════════════════ */
    function startBattle(lv, severity) {
        const enemy = enemies[lv] || enemies[10];
        state.battleEnemy  = enemy;
        state.enemyMaxHp   = enemy.hp;
        state.enemyHp      = enemy.hp;
        state.playerMaxHp  = 10 + lv * 2;
        state.playerHp     = state.playerMaxHp;
        state.battleTurn   = 0;
        state.mercyCount   = 0;
        state.helpCharge   = 0;
        state.shieldActive = false;

        show('screen-battle');
        hide('screen-quiz'); hide('screen-story'); hide('screen-end');
        hide('helpResources'); hide('supportMsg');

        // Reset botón PIEDAD
        const btnMercy = document.getElementById('btnMercy');
        if(btnMercy){ btnMercy.textContent = '🕊 PIEDAD'; btnMercy.classList.remove('charged'); }
        const wrap = document.getElementById('mercyChargeWrap');
        if(wrap) wrap.style.display = lv === 10 ? 'block' : 'none';
        if(lv === 10) updateMercyCharge();

        // Sprite y nombre
        const canvas = document.getElementById('enemySprite');
        drawSprite(canvas, enemy.sprite, enemy.color);
        document.getElementById('enemyName').textContent = enemy.name;
        document.getElementById('playerNameLv').textContent = `JUGADOR  LV ${lv}`;

        setPlayerHp(state.playerHp, state.playerMaxHp);
        setEnemyHp(state.enemyHp, state.enemyMaxHp);
        enableActionBtns();
        closeMenu();

        // Mostrar recursos si nivel >= 7
        if(lv >= 7){ const hr = document.getElementById('helpResources'); hr.classList.add('show'); hr.style.display = 'block'; }

        // Mensaje de apoyo
        const sm = document.getElementById('supportMsg');
        document.getElementById('supportMsgText').textContent = supportMessages[severity || levelToSeverity(lv)];
        sm.classList.add('show'); sm.style.display = 'block';

        const txt = document.getElementById('battleText');
        typewrite(txt, enemy.msg + '\n* ¿Qué harás?');
        scrollToGame();
    }

    /* ─── ACCIONES DE BATALLA ─── */

    function doFight() {
        if(state.playerHp <= 0) return;
        disableActionBtns(); closeMenu();
        const lv = state.playerLevel || 1;
        const dmg = Math.floor(Math.random() * 6) + 3 + Math.floor(lv / 2);
        const txt = document.getElementById('battleText');

        // El DOXXER es inmune a LUCHAR
        if(state.battleEnemy.hp > 100) {
            typewrite(txt, '* JAJAJA. ¿Atacarme? Tus golpes digitales no pueden hacerme daño.\n* Carga tu PIEDAD para derrotarme.', 25, () => {
                state.helpCharge = Math.min(100, state.helpCharge + 30);
                updateMercyCharge();
                enemyAttack();
            });
            return;
        }

        setEnemyHp(state.enemyHp - dmg, state.enemyMaxHp);
        if(state.enemyHp <= 0) {
            typewrite(txt, `* ¡Golpe de ${dmg} de daño!\n* ¡Derrotaste a ${state.battleEnemy.name.replace('\n',' ')}!\n* Recuerda: en la vida real, la mejor batalla es pedir ayuda.`, 25, () => {
                enableActionBtns(); setTimeout(() => endBattle('fight'), 2000);
            });
        } else {
            typewrite(txt, `* Usaste LUCHAR. Dañaste ${dmg} HP.\n* El enemigo contraataca...`, 25, enemyAttack);
        }
    }

    function doMercy() {
        if(state.playerHp <= 0) return;
        disableActionBtns(); closeMenu();
        state.mercyCount++;
        const txt = document.getElementById('battleText');
        const needed = Math.max(3, Math.floor(state.playerLevel / 2));

        // Si es DOXXER y está cargado → llamar ayuda y ganar
        if(state.battleEnemy.hp > 100 && state.helpCharge >= 100) {
            typewrite(txt, '* La música caótica se detiene.\n* Una figura protectora aparece en pantalla.\n* La red de apoyo interviene. ¡EL DOXXER PIERDE SU PODER!', 25, () => {
                enableActionBtns(); setTimeout(() => endBattle('mercy'), 2500);
            });
            return;
        }

        if(state.mercyCount >= needed || state.playerLevel <= 2) {
            typewrite(txt, '* Elegiste la PIEDAD. No toda batalla se gana luchando.\n* Alejarse y buscar ayuda es el acto más valiente.', 25, () => {
                enableActionBtns(); setTimeout(() => endBattle('mercy'), 2000);
            });
        } else {
            typewrite(txt, `* Intentas la piedad... (${state.mercyCount}/${needed})\n* El enemigo no cede todavía.`, 25, enemyAttack);
        }
    }

    /* ── MENÚ DE ACTUAR (dinámico por enemigo) ── */
    function showActMenu() {
        if(state.playerHp <= 0 || !state.battleEnemy) return;
        const acts = state.battleEnemy.acts || [];
        const html = acts.map((a, i) => `<button class="game-choice" onclick="Game.useAct(${i})">💬 ${a.name}</button>`).join('');
        openMenu(html);
    }

    function useAct(index) {
        closeMenu(); disableActionBtns();
        const act = state.battleEnemy.acts[index];
        if(!act) return;
        if(act.shield) state.shieldActive = true;
        const txt = document.getElementById('battleText');
        typewrite(txt, act.text, 25, () => {
            if(act.win) {
                enableActionBtns();
                setTimeout(() => endBattle('act'), 2500);
            } else {
                enemyAttack();
            }
        });
    }

    /* ── MENÚ DE ITEMS ── */
    function showItemMenu() {
        if(state.playerHp <= 0) return;
        const html = state.inventory.map(it => `<button class="game-choice safe" onclick="Game.useItem('${it.id}')">❤ ${it.name}</button>`).join('');
        openMenu(html);
    }

    function useItem(id) {
        closeMenu(); disableActionBtns();
        const item = state.inventory.find(i => i.id === id);
        if(!item) return;
        const newHp = Math.min(state.playerMaxHp, state.playerHp + item.heal);
        setPlayerHp(newHp, state.playerMaxHp);
        if(id === 'captura') state.shieldActive = true;
        const txt = document.getElementById('battleText');
        typewrite(txt, `* Usaste: ${item.name}.\n* ${item.desc}\n* (+${item.heal} HP)`, 25, () => {
            // Para el DOXXER, items también cargan la barra
            if(state.battleEnemy.hp > 100){ state.helpCharge = Math.min(100, state.helpCharge + 20); updateMercyCharge(); }
            enemyAttack(false, true);
        });
    }

    /* ── Helpers de menú dinámico ── */
    function openMenu(html) {
        document.getElementById('actionBtns').style.display = 'none';
        const menu = document.getElementById('dynamicMenu');
        menu.classList.add('open');
        menu.innerHTML = html + `<button class="game-choice danger" onclick="Game.closeMenu()">⬅ Cancelar</button>`;
    }
    function closeMenu() {
        const menu = document.getElementById('dynamicMenu');
        if(menu){ menu.classList.remove('open'); menu.innerHTML = ''; }
        const btns = document.getElementById('actionBtns');
        if(btns) btns.style.display = 'flex';
    }

    /* ── TURNO DEL ENEMIGO ── */
    function enemyAttack(reduced = false, itemUsed = false) {
        state.battleTurn++;
        const enemy = state.battleEnemy;

        // Si el escudo está activo, el ataque se bloquea
        if(state.shieldActive) {
            state.shieldActive = false;
            const txt = document.getElementById('battleText');
            const dialogue = enemy.dialogues[(state.battleTurn - 1) % enemy.dialogues.length];
            typewrite(txt, `* "—${dialogue}"\n* ¡Tu Escudo de Evidencia bloqueó el ataque!`, 25, enableActionBtns);
            // Para el DOXXER: cargar piedad
            if(enemy.hp > 100){ state.helpCharge = Math.min(100, state.helpCharge + 30); updateMercyCharge(); }
            return;
        }

        let dmg = Math.max(1, Math.floor(Math.random() * enemy.atk * 0.4) + 1);
        if(reduced)  dmg = Math.max(1, Math.floor(dmg * 0.5));
        if(itemUsed) dmg = Math.max(1, Math.floor(dmg * 0.7));

        setPlayerHp(state.playerHp - dmg, state.playerMaxHp);

        const gc = document.getElementById('gameContainer');
        gc.classList.add('shake');
        setTimeout(() => gc.classList.remove('shake'), 500);

        // Para el DOXXER: cargar piedad por daño recibido
        if(enemy.hp > 100){ state.helpCharge = Math.min(100, state.helpCharge + 25); updateMercyCharge(); }

        const txt = document.getElementById('battleText');
        const dialogue = enemy.dialogues[(state.battleTurn - 1) % enemy.dialogues.length];

        if(state.playerHp <= 0) {
            typewrite(txt, `* "—${dialogue}"\n* El ataque fue devastador (${dmg} daño).\n* ¡Tu HP llegó a 0! Pero pedir ayuda no es derrota.`, 25, () => {
                enableActionBtns(); setTimeout(() => endBattle('lose'), 1500);
            });
        } else {
            const msgs = [
                `* "—${dialogue}"\n* El enemigo ataca (−${dmg} HP). ¿Qué harás ahora?`,
                `* "—${dialogue}"\n* El ataque te sacude (−${dmg} HP). No te rindas.`,
                `* "—${dialogue}"\n* Recibes ${dmg} de daño. Recuerda: pedir ayuda también es una opción.`,
            ];
            typewrite(txt, msgs[state.battleTurn % msgs.length], 25, enableActionBtns);
        }
    }

    /* ── FIN DE BATALLA ── */
    function endBattle(outcome) {
        hide('screen-battle');
        show('screen-end');

        const txt = document.getElementById('endText');
        const res = document.getElementById('endResources');
        const msgs = {
            fight: '★ ¡Superaste el encuentro!\n\n* En la vida real, la mejor estrategia contra el acoso digital es documentar, reportar y pedir ayuda.\n* Nunca enfrentes solo/a situaciones graves.',
            act:   '★ ¡Resolviste el conflicto con la acción correcta!\n\n* Usar las herramientas digitales a tu favor (bloquear, reportar, guardar pruebas) es una forma de ganar sin violencia.',
            mercy: '★ Elegiste la PIEDAD.\n\n* Alejarte de situaciones tóxicas en internet es una decisión valiente y sabia.\n* Bloquear, reportar y hablar con alguien son superpoderes reales.',
            lose:  '★ Tu HP llegó a cero...\n\n* Pero esto no es una derrota real.\n* En la vida real, pedir ayuda cuando estás al límite ES ganar.\n* No estás solo/a.',
        };
        typewrite(txt, msgs[outcome] || msgs.lose);

        res.innerHTML = `
            <div style="border:3px solid var(--yellow); padding:14px; margin-top:14px;">
                <p class="pf-xs ty" style="margin-bottom:10px;">⭐ LÍNEAS DE APOYO — BOLIVIA</p>
                <p style="font-size:19px; margin:5px 0;">📞 <strong style="color:var(--orange)">Defensoría del Pueblo:</strong> 800-10-0466 (gratuito)</p>
                <p style="font-size:19px; margin:5px 0;">📞 <strong style="color:var(--orange)">Línea Violencia:</strong> 800-10-0200 (gratuito)</p>
                <p style="font-size:19px; margin:5px 0;">📞 <strong style="color:var(--orange)">Policía Nacional:</strong> 110</p>
                <p style="font-size:19px; margin:5px 0;">📞 <strong style="color:var(--orange)">SEPDAVI:</strong> (02) 2200-200</p>
                <p style="font-size:19px; margin:5px 0;">💻 <strong style="color:var(--orange)">ATIC (delitos digitales):</strong> atic.policia.bo</p>
            </div>`;
        scrollToGame();
    }

    /* ══════════════════════════════════════════
       HISTORIA NARRATIVA
    ══════════════════════════════════════════ */
    function startStory() {
        hide('screen-intro'); show('screen-story');
        renderStoryNode('start');
        scrollToGame();
    }

    function renderStoryNode(nodeId) {
        const node = storyNodes[nodeId];
        if(!node) return;
        state.storyNode = nodeId;

        const txt     = document.getElementById('storyText');
        const choices = document.getElementById('storyChoices');

        typewrite(txt, node.text, 22);
        choices.innerHTML = '';

        if(node.isEnd) {
            const color = node.endType === 'good' ? 'safe' : 'danger';
            choices.innerHTML = `
                <button class="game-choice ${color}" onclick="Game.reset()">♻ JUGAR DE NUEVO</button>
                <button class="game-choice" onclick="Game.startQuestionnaire()">📊 HACER EL CUESTIONARIO</button>`;
            if(node.endType === 'bad') {
                choices.insertAdjacentHTML('afterend', `
                    <div style="border:3px solid var(--orange); padding:12px; margin-top:12px; font-size:19px; line-height:1.5;">
                        * A veces no actuamos por miedo o porque no sabemos cómo.<br>
                        * SafeZone está aquí para enseñarte cómo ayudar y protegerte.<br>
                        <span class="ty">* 📞 Defensoría del Pueblo: 800-10-0466</span>
                    </div>`);
            }
            return;
        }

        node.choices.forEach(ch => {
            const btn = document.createElement('button');
            const cls = ch.route === 0 ? 'danger' : 'safe';
            btn.className = `game-choice ${cls}`;
            btn.textContent = ch.label;
            if(ch.battle) {
                btn.addEventListener('click', () => {
                    hide('screen-story');
                    startBattle(ch.battle, levelToSeverity(ch.battle));
                    // Al terminar la batalla de la historia, volver al nodo siguiente
                    state._afterBattle = ch.next;
                });
            } else {
                btn.addEventListener('click', () => renderStoryNode(ch.next));
            }
            choices.appendChild(btn);
        });
    }

    /* ══════════════════════════════════════════
       BESTIARIO — Inspeccionar al hacer clic
    ══════════════════════════════════════════ */
    function initBestiary() {
        document.querySelectorAll('.info-card').forEach(card => {
            card.addEventListener('click', () => {
                const lv    = parseInt(card.dataset.level) || 1;
                const check = card.dataset.check || '';
                const name  = card.querySelector('h3').innerText;

                // Highlight visual de la card
                document.querySelectorAll('.info-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // Mostrar en la caja de batalla
                const txt = document.getElementById('battleText');
                if(txt) {
                    hide('screen-intro'); hide('screen-quiz'); hide('screen-story'); hide('screen-end');
                    show('screen-battle');

                    startBattle(lv, levelToSeverity(lv));

                    // Overwrite el texto inicial con el check
                    setTimeout(() => {
                        typewrite(txt, `* CHECK: ${name.toUpperCase()}\n* ATK ${card.dataset.atk || '?'} / DEF ${card.dataset.def || '?'}\n* ${check}\n\n* ¿Qué harás?`);
                    }, 200);
                }

                const mb = document.querySelector('.main-battle');
                mb.classList.add('hl');
                setTimeout(() => mb.classList.remove('hl'), 1200);

                scrollToGame();
            });
        });
    }

    /* ══════════════════════════════════════════
       VOLUNTARIADO — botón Postularme
    ══════════════════════════════════════════ */
    function handleJoin(btn) {
        btn.textContent = '* ¡Registrado! Gracias por unirte. ❤';
        btn.disabled = true;
    }

    /* ══════════════════════════════════════════
       MODAL PÁNICO
    ══════════════════════════════════════════ */
    function openPanic() {
        const modal = document.getElementById('panicModal');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        scrollToGame();
    }
    function closeModal() {
        const modal = document.getElementById('panicModal');
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    /* ══════════════════════════════════════════
       RESET Y NAVEGACIÓN
    ══════════════════════════════════════════ */
    function backToIntro() {
        ['screen-quiz','screen-battle','screen-story','screen-end'].forEach(hide);
        show('screen-intro');
        scrollToGame();
    }

    function reset() {
        state.quizScore   = 0;
        state.playerLevel = 1;
        state.playerHp    = 20;
        state.helpCharge  = 0;
        currentQ = 0;
        document.getElementById('helpResources').style.display = 'none';
        document.getElementById('supportMsg').style.display    = 'none';
        const wrap = document.getElementById('mercyChargeWrap');
        if(wrap) wrap.style.display = 'none';
        backToIntro();
    }

    /* ══════════════════════════════════════════
       INIT
    ══════════════════════════════════════════ */
    function init() {
        initBestiary();

        // Cerrar modal al hacer clic afuera
        document.getElementById('panicModal').addEventListener('click', e => {
            if(e.target === e.currentTarget) closeModal();
        });
        document.querySelector('.modal-close').addEventListener('click', closeModal);
        document.getElementById('resetBtn').addEventListener('click', reset);
    }

    /* ══════════════════════════════════════════
       API PÚBLICA
    ══════════════════════════════════════════ */
    return {
        startQuestionnaire, answerQ,
        startStory, renderStoryNode, backToIntro,
        doFight, showActMenu, useAct, showItemMenu, useItem, closeMenu,
        doMercy, handleJoin,
        openPanic, closeModal,
        reset, init,
    };
})();

document.addEventListener('DOMContentLoaded', Game.init);
