const BAUDRATE = 115200;
const regex = /T(\d{2})/;       // Reg exp. para parsear los datos

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
            data: [],
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

/* Leo datos, parseo y guardo en JSON */
async function readFromUART() {    
    const reader = port.readable.getReader({ mode: "byob" });
    let data_str, match, temp; 

    while (true) {
        buffer = await readInto(reader, buffer);

        /* Paso a string y busco datos */
        data_str = new TextDecoder().decode(buffer);
        match = data_str.match(regex);
        if (match) {
            temp = parseInt(match[1], 10);
            console.log(temp);
            dataChart.data.labels.push(new Date().toLocaleTimeString());
            dataChart.data.datasets[0].data.push(temp);
            dataChart.update();
        }
    }
}

