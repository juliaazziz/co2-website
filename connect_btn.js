const BAUDRATE = 115200;
const MAX_POINTS = 100;
const regex = /C(\d+)T(\d+)/;

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
      
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
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

/* Función auxiliar para leer buffer y guardar datos */
async function readInto(reader, buffer) {
    let offset = 0;
    let buf_str = "";
    let str;

    while ((offset < 18) && (str != "\r")) {
        const { value, done } = await reader.read( new Uint8Array(buffer));
        if (done) {
            break;
        }
        buffer = value.buffer;
        str = new TextDecoder().decode(buffer);
        offset += value.byteLength;
        buf_str += new TextDecoder().decode(buffer);
    }
    return buf_str;
}

/* Leo datos, parseo y actualizo gráfica */
async function readFromUART() {    
    const reader = port.readable.getReader({ mode: "byob" });
    let data_str, match, co2, temp; 
    
    while (true) {
        let buffer = new ArrayBuffer(1);
        data_str = await readInto(reader, buffer);
        console.log(data_str);

        /* Paso a string y busco datos */
        match = data_str.match(regex);
        if (match) {
            co2 = parseInt(match[1], 10);
            temp = parseInt(match[2], 10);

            dataChart.data.labels.push(new Date().toLocaleTimeString());
            dataChart.data.datasets[0].data.push(co2);
            dataChart.data.datasets[1].data.push(temp);
            dataChart.update();

            /* Si hay demasiados puntos solo muestro los últimos */
            if (dataChart.data.datasets[0].data.length > MAX_POINTS) {
                dataChart.data.labels.shift();
                dataChart.data.datasets[0].data.shift();
            }
        }
    }
}

