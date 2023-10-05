const BAUDRATE = 115200;
const MAX_POINTS = 100;
const regex = /C(\d+)/;

const connectButton = document.getElementById('connect_btn');
let port;

/* Variable donde guardo la gráfica */
const dataChart = new Chart(
    document.getElementById('chart'),
    {
    type: 'line',
    options: {
        plugins: {
            legend: {
                labels: {
                    font: {
                        size: 17
                    }
                }
            }
        },
        responsive: true,
        stacked: false
    },
    data: {
        labels: [],
        datasets: [
        {
            label: 'Concentración de CO2 (ppm)',
            data: [].slice(-2),
        }
        ]
    }
    }
);

/* Funciones para conexión serial */

async function connectToSerialPort() {
    try {
        /* Queda esperando al puerto */
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: BAUDRATE });
        console.log(`Conectado a ${port.getInfo().usbProductId}`);
        getReader();
    } catch (err) {
        console.error('Error:', err);
    }
}

connectButton.addEventListener('click', connectToSerialPort);

async function getReader() {
    setTimeout(() => {
        if (port && port.readable) {
            readFromUART();
        }
    }, 1500);
}

let buffer = new ArrayBuffer(10);
let view = new Uint8Array(buffer);

/* Función auxiliar para leer buffer y guardar datos */
async function readInto(reader, buffer) {
    let offset = 0;

    while (offset < buffer.byteLength) {
      const { value, done } = await reader.read(
        new Uint8Array(buffer, offset)
      );
      if (done) {
        break;
      }
      buffer = value.buffer;
      offset += value.byteLength;
    }

    return buffer;
}

/* Leo datos, parseo y actualizo gráfica */
async function readFromUART() {    
    const reader = port.readable.getReader({ mode: "byob" });
    let data_str, match, co2; 

    while (true) {
        buffer = await readInto(reader, buffer);

        /* Paso a string y busco datos */
        data_str = new TextDecoder().decode(buffer);
        match = data_str.match(regex);
        if (match) {
            co2 = parseInt(match[1], 10);
            dataChart.data.labels.push(new Date().toLocaleTimeString());
            dataChart.data.datasets[0].data.push(co2);
            dataChart.update();

            /* Si hay demasiados puntos solo muestro los últimos */
            if (dataChart.data.datasets[0].data.length > MAX_POINTS) {
                dataChart.data.labels.shift();
                dataChart.data.datasets[0].data.shift();
            }
        }
    }
}

