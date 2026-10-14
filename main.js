const formulario = document.getElementById('form-recomendacion');
const boton = formulario.querySelector('button[type="submit"]');
const mensaje = document.getElementById('mensaje');
const gridJuegos = document.getElementById('grid-juegos');
const inputId = document.getElementById('juego-id');
const tituloForm = document.getElementById('titulo-form');

const etiquetasGenero = {
    accion: 'Acción',
    aventura: 'Aventura',
    rpg: 'RPG',
    estrategia: 'Estrategia',
    deportes: 'Deportes',
    simulacion: 'Simulación',
};

const etiquetasPlataforma = {
    pc: 'PC',
    playstation: 'PlayStation',
    xbox: 'Xbox',
    'nintendo-switch': 'Nintendo Switch',
    mobile: 'Mobile',
    multi: 'Multiplataforma',
};

document.addEventListener('DOMContentLoaded', cargarJuegos);

async function cargarJuegos() {
    gridJuegos.textContent = '';
    const cargando = document.createElement('p');
    cargando.textContent = 'Cargando recomendaciones...';
    gridJuegos.appendChild(cargando);

    try {
        const { data, error } = await supabase
            .from('AppVideojuegos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            gridJuegos.textContent = 'No se pudieron cargar las recomendaciones';
            console.error(error);
            return;
        }

        gridJuegos.textContent = '';

        if (!data || data.length === 0) {
            const vacio = document.createElement('p');
            vacio.textContent = 'Todavía no hay recomendaciones. Publicá la primera.';
            gridJuegos.appendChild(vacio);
            return;
        }

        data.forEach((juego) => {
            const tarjeta = document.createElement('article');
            tarjeta.className = 'card-juego';

            const img = document.createElement('img');
            img.src = juego.url_portada;
            img.alt = 'Portada de ' + juego.titulo;
            img.onerror = () => {
                const sinPortada = document.createElement('div');
                sinPortada.className = 'sin-portada';
                sinPortada.textContent = 'Sin portada';
                tarjeta.replaceChild(sinPortada, img);
            };

            const cuerpo = document.createElement('div');
            cuerpo.className = 'card-body';

            const filaCard = document.createElement('div');
            filaCard.className = 'fila-card';

            const badge = document.createElement('span');
            badge.className = 'badge-genero';
            badge.textContent = etiquetasGenero[juego.genero] || juego.genero;

            const score = document.createElement('span');
            score.className = 'score';
            score.textContent = juego.puntuacion + '/10';

            const titulo = document.createElement('h3');
            titulo.className = 'card-titulo';
            titulo.textContent = juego.titulo;

            const resenia = document.createElement('p');
            resenia.className = 'card-resenia';
            resenia.textContent = juego.resenia;

            const extra = document.createElement('p');
            extra.className = 'card-extra';
            const partes = [];
            partes.push(etiquetasPlataforma[juego.plataforma] || juego.plataforma);
            if (juego.anio) partes.push(juego.anio.slice(0, 4));
            if (juego.terminado) partes.push('Terminado');
            extra.textContent = partes.join(' · ');

            filaCard.appendChild(badge);
            filaCard.appendChild(score);

            cuerpo.appendChild(filaCard);
            cuerpo.appendChild(titulo);
            cuerpo.appendChild(resenia);
            cuerpo.appendChild(extra);

            const acciones = document.createElement('div');
            acciones.className = 'card-actions';

            const botonEditar = document.createElement('button');
            botonEditar.type = 'button';
            botonEditar.className = 'btn-action btn-edit';
            botonEditar.textContent = 'Editar';
            botonEditar.addEventListener('click', () => prepararEdicion(juego.id));

            const botonEliminar = document.createElement('button');
            botonEliminar.type = 'button';
            botonEliminar.className = 'btn-action btn-delete';
            botonEliminar.textContent = 'Eliminar';
            botonEliminar.addEventListener('click', () => eliminarJuego(juego.id));

            acciones.appendChild(botonEditar);
            acciones.appendChild(botonEliminar);

            cuerpo.appendChild(acciones);

            tarjeta.appendChild(img);
            tarjeta.appendChild(cuerpo);
            gridJuegos.appendChild(tarjeta);
        });
    } catch (e) {
        gridJuegos.textContent = 'No se pudieron cargar las recomendaciones';
        console.error(e);
    }
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = 'mensaje-' + tipo;
}

formulario.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = inputId.value;
    const portadaInput = document.getElementById('portada-file');
    const archivo = portadaInput.files[0];

    if (!archivo && !id) {
        mostrarMensaje('Seleccioná una imagen de portada', 'error');
        return;
    }

    boton.disabled = true;

    try {
        let urlPortada = null;

        if (archivo) {
            const nombreArchivo = Date.now() + '_' + archivo.name.replace(/\s+/g, '_');
            const { error: uploadError } = await supabase.storage
                .from('portadas')
                .upload(nombreArchivo, archivo);

            if (uploadError) {
                mostrarMensaje('No se pudo subir la imagen: ' + uploadError.message, 'error');
                return;
            }

            const { data: urlData } = supabase.storage
                .from('portadas')
                .getPublicUrl(nombreArchivo);

            urlPortada = urlData.publicUrl;
        }

        const datos = {
            titulo: document.getElementById('titulo').value.trim(),
            genero: document.getElementById('genero').value,
            puntuacion: Number(document.getElementById('puntuacion').value),
            resenia: document.getElementById('resenia').value.trim(),
            plataforma: document.getElementById('plataforma').value,
            anio: document.getElementById('anio').value || null,
            terminado: document.getElementById('terminado').checked,
        };

        if (urlPortada) {
            datos.url_portada = urlPortada;
        }

        let error;

        if (id) {
            ({ error } = await supabase
                .from('AppVideojuegos')
                .update(datos)
                .eq('id', id));
        } else {
            ({ error } = await supabase
                .from('AppVideojuegos')
                .insert([datos]));
        }

        if (error) {
            const accion = id ? 'actualizar' : 'guardar';
            mostrarMensaje('No se pudo ' + accion + ' la recomendación: ' + error.message, 'error');
            return;
        }

        cancelarEdicion();
        if (id) {
            mostrarMensaje('Recomendación actualizada correctamente', 'ok');
        } else {
            mostrarMensaje('Recomendación guardada correctamente', 'ok');
        }
        await cargarJuegos();
    } catch (e) {
        mostrarMensaje('No se pudo guardar la recomendación: ' + e.message, 'error');
    } finally {
        boton.disabled = false;
    }
});

async function eliminarJuego(id) {
    try {
        const confirmado = confirm('¿Seguro que querés eliminar esta recomendación?');
        if (!confirmado) return;

        const { error } = await supabase
            .from('AppVideojuegos')
            .delete()
            .eq('id', id);

        if (error) {
            mostrarMensaje('No se pudo eliminar: ' + error.message, 'error');
            return;
        }

        mostrarMensaje('Recomendación eliminada correctamente', 'ok');
        if (inputId.value == id) {
            cancelarEdicion();
        }
        await cargarJuegos();
    } catch (e) {
        mostrarMensaje('No se pudo eliminar: ' + e.message, 'error');
        console.error(e);
    }
}

async function prepararEdicion(id) {
    try {
        const { data: juego, error } = await supabase
            .from('AppVideojuegos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        inputId.value = juego.id;
        document.getElementById('titulo').value = juego.titulo;
        document.getElementById('genero').value = juego.genero;
        document.getElementById('puntuacion').value = juego.puntuacion;
        document.getElementById('resenia').value = juego.resenia;
        document.getElementById('plataforma').value = juego.plataforma;
        document.getElementById('anio').value = juego.anio || '';
        document.getElementById('terminado').checked = juego.terminado;

        document.getElementById('portada-file').required = false;

        tituloForm.textContent = 'Editar recomendación';
        boton.textContent = 'Guardar cambios';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        mostrarMensaje('No se pudo cargar la recomendación para editar: ' + e.message, 'error');
    }
}

function cancelarEdicion() {
    formulario.reset();
    inputId.value = '';
    document.getElementById('portada-file').required = true;
    tituloForm.textContent = 'Publicar una recomendación';
    boton.textContent = 'Publicar recomendación';
}
