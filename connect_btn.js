const BAUDRATE = 115200;
const MAX_POINTS = 100;
const regex = /C(\d+)T(\d+)/;

const connectButton = document.getElementById('connect_btn');

/* Variable con la gráfica */
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
            stacked: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',

                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        },
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Concentración de CO2 (ppm)',
                    data: [],
                    yAxisID: 'y'
                },
                {
                    label: 'Temperatura (°C)',
                    data: [],
                    yAxisID: 'y1'
                }
            ]
        }
    }
);

/* Funciones para conexión serial */

let port;

async function connectToSerialPort() {
    try {
        /* Conecta al puerto elegido */
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: BAUDRATE });
        console.log(`Conectado a ${port.getInfo().usbProductId}`);

        /* Queda leyendo datos */
        getReader();
    } catch (err) {
        console.error('Error:', err);
    }
}

connectButton.addEventListener('click', connectToSerialPort);

/* Lee datos cuando haya */
async function getReader() {
    setTimeout(() => {
        if (port && port.readable) {
            readFromUART();
        }
    }, 1500);
}

/* Función auxiliar para leer buffer que devuelve string con el dato */
async function readInto(reader, buffer) {
    let offset = 0;
    let data = "";
    let str;

    /* El nodo envía 17 o 18 bytes */
    while ((offset < 18) && (str != "\r")) {
        const { value, done } = await reader.read(new Uint8Array(buffer));
        if (done) {
            break;
        }
        buffer = value.buffer;
        offset += value.byteLength;
        str = new TextDecoder().decode(buffer);
        data += str;
    }
    return data;
}

/* Leo datos, parseo y actualizo gráfica */
async function readFromUART() {
    let data_str, match, co2, temp;
    const reader = port.readable.getReader({ mode: "byob" });

    while (true) {
        data_str = await readInto(reader, new ArrayBuffer(1));

        /* Busco datos */
        match = data_str.match(regex);
        if (match) {
            co2 = parseInt(match[1], 10);
            temp = parseInt(match[2], 10);

            /* Grafico nuevos datos */
            dataChart.data.labels.push(new Date().toLocaleTimeString());
            dataChart.data.datasets[0].data.push(co2);
            dataChart.data.datasets[1].data.push(temp);
            dataChart.update();

            /* Si hay demasiados puntos solo muestro los últimos */
            if (dataChart.data.datasets[0].data.length > MAX_POINTS) {
                dataChart.data.labels.shift();
                dataChart.data.datasets[0].data.shift();
                dataChart.data.datasets[1].data.shift();
            }
        }
    }
}

