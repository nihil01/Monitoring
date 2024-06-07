import sys
import os
import psutil
import requests
import time


def calculategb(bytes_value):
    return round(bytes_value / (2**30))

def calculatemb(bytes_value):
    return round(bytes_value / (2**20))


def check_device(drive_path):
    try:
        if os.path.exists(drive_path) and os.path.isdir(drive_path):
            os.listdir(drive_path)
            return True
        else:
            return False
    except PermissionError:
        return False
    except FileNotFoundError:
        return False
    except OSError as e:
        return False


iteration_counter = 0


def monitor_resources():
    cpu_percent = psutil.cpu_percent(), psutil.cpu_freq()
    memory_info = psutil.virtual_memory()

    user = psutil.users()[0][0]

    disk_info_list = []

    for partition in psutil.disk_partitions():
        if check_device(partition[0]):
            disk_info = {}
            disk = psutil.disk_usage(partition[0])
            disk_info['mountpoint'] = partition[1]
            disk_info['used_gb'] = calculategb(disk.used)
            disk_info['total_gb'] = calculategb(disk.total)
            disk_info['used_percent'] = disk.percent

            disk_info_list.append(disk_info)
        else:
            sys.exit()

    memory_load = [memory_info.percent, calculategb(memory_info.used), calculategb(memory_info.total)]

    def powered_on():
        boot_time = psutil.boot_time()
        start_time = time.time()
        timestamp = start_time - boot_time
        uptime = {
            "minutes": (timestamp//60)%60,
            "hours": (timestamp//3600)%60,
            "days": (timestamp//216000)%24
        }
        return uptime

    def network_info():
        network_io = psutil.net_io_counters()
        network = {
            "mb_sent": calculatemb(network_io.bytes_sent),
            "mb_received": calculatemb(network_io.bytes_recv),
            "packets_sent": network_io.packets_sent,
            "packets_received": network_io.packets_recv
        }
        return network

    def get_process_info():
        process_info = []
        for p in psutil.process_iter(['pid', 'name', 'memory_percent', 'cpu_percent']):
            if p.info['memory_percent'] > 1 and p.info['cpu_percent'] > 0.33:
                try:
                    process_info.append({
                        "pid": p.info['pid'],
                        "name": p.info['name'],
                        "memory_percent": p.info['memory_percent'],
                        "cpu_percent": p.info['cpu_percent']
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        return process_info

    disk_condition_list = []

    def get_disk_io_counters():
        io_counters = psutil.disk_io_counters(perdisk=True)
        count = 0
        for drive_name in io_counters.keys():
            disks = {}
            disks["drive_name"] = 'Drive{count}'.format(count=count)
            disks["read_count"] = io_counters[drive_name].read_count
            disks["write_count"] = io_counters[drive_name].write_count
            disks["read_gb"] = calculategb(io_counters[drive_name].read_bytes)
            disks["write_gb"] = calculategb(io_counters[drive_name].write_bytes)
            disks["read_time"] = io_counters[drive_name].read_time
            disks["write_time"] = io_counters[drive_name].write_time
            disk_condition_list.append(disks)
            count += 1

    get_disk_io_counters()

    def battery_sensors():
        battery = psutil.sensors_battery()
        return {
            "battery_percents": battery.percent,
            "battery_status": battery.power_plugged
        }

    data = {
        "user": user,
        "cpu_percent": cpu_percent,
        "memory_info": memory_load,
        "disk_info": disk_info_list,
        "system_uptime": powered_on(),
        "network_info": network_info(),
        "process_info": get_process_info(),
        "disk_io_counters": disk_condition_list,
        "battery_sensors": battery_sensors()
    }

    url = 'http://192.168.0.126:9999'
    headers = {'Content-Type': 'application/json'}

    if iteration_counter == 2:
        requests.post(url, json=data, headers=headers)
    else:
        time.sleep(6)


if __name__ == "__main__":
    try:
        while iteration_counter < 3:
            monitor_resources()
            iteration_counter += 1
        exit()
    except KeyboardInterrupt:
        print('script stopped by user')
