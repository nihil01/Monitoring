import nodemailer from 'nodemailer';

import {eventEmitter,body} from './index.js'

const transporter = nodemailer.createTransport({
    host: "xxx",
    port: 25,
    secure: false,
    auth : {
        user:"xxx",
        pass:process.env.PASSWORD
    }
})

eventEmitter.on('dataReceived', ()=>{
    let obj = JSON.parse(body);

    const processMapped = {}

    obj.process_info.forEach(process => {
        const name = process.name;
        if(!processMapped[name]){
            processMapped[name] = {
                pid: process.pid,
                name: process.name,
                memory_percent: process.memory_percent,
                cpu_percent: process.cpu_percent,
            }
        }else{
            processMapped[name].memory_percent += process.memory_percent;
            processMapped[name].cpu_percent += process.cpu_percent;
        }
    })

    console.log(processMapped)


    let htmlOutput = `
        <div>
            <h2>Пользователь: ${obj.user}</h2>
            <p>Процессор: <br>
               Текущая нагрузка: ${obj.cpu_percent[0]}% | Скорость: ${(obj.cpu_percent[1][0]/1000).toPrecision(2)}GHz</p>
            <p>Память: <br>
               Текущая нагрузка: ${obj.memory_info[0]}% | Всего: ${obj.memory_info[1]}Gb Использовано: ${obj.memory_info[2]}Gb</p>
            <p>Накопители:</p>
            <ul>
                ${obj.disk_info.map(disk => `
                    <li>
                        Диск: ${disk.mountpoint} | Текущая заполненность: ${disk.used_percent}% | Занято: ${disk.used_gb}Gb 
                        Свободно: ${disk.total_gb - disk.used_gb}Gb | Всего: ${disk.total_gb}Gb
                    </li>`).join('')}
            </ul>
            <p>Система работает: <br>
               ${obj.system_uptime.days} дней, ${obj.system_uptime.hours} часов, ${obj.system_uptime.minutes} минут</p>
            <p>Сеть: <br>
               С момента включения было передано ${obj.network_info.mb_sent}Mb данных, ${obj.network_info.packets_sent} пакетов,
               было получено ${obj.network_info.mb_received}Mb данных, ${obj.network_info.packets_received} пакетов.</p>
            <p>Текущие процессы:</p>
             <ul>
                ${Object.values(processMapped).map(process => `
                    <li>
                        Имя процесса: ${process.name}, Ресурсы памяти: ${Math.round(process.memory_percent)}%, 
                        Ресурсы процессора: ${process.cpu_percent}%
                    </li>`).join('')}
             </ul>
            <p>Состояние дисков(за включение компьютера):</p>
            <ul>
                ${obj.disk_io_counters.map(disk => `
                    <li>
                        Диск: ${disk.drive_name}, Прочитано: ${disk.read_gb}Gb | Записано: ${disk.write_gb}Gb,
                        Время чтения: ${disk.read_time} | Время записи: ${disk.write_time},
                        Циклы чтения: ${disk.read_count} , Циклы записи: ${disk.write_count}
                    </li>`)}
            </ul>
            ${obj.battery_sensors ? `
                <p>Аккумулятор: <br>
                   Текущий заряд: ${obj.battery_sensors.battery_percents}%, 
                   Состояние: ${obj.battery_sensors.battery_status === false ? 'Не заряжается' : 'Заряжается'}</p>` : '<p>Аккумулятор не обнаружен</p>'}
        </div>
`

    const main = async() => {
        const info = await transporter.sendMail({
            from: '"xxx" <xxx>',
            to: "xxx",
            subject: "Monitoring script Report",
            text:"this is an automatically generated auto-report.",
            html:htmlOutput
        })
        console.log(`message sent: ${info.messageId}`)
    }
    main().catch(console.error)
})
