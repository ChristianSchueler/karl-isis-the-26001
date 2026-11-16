// Karl-Isis the 25001 Cocktail Mixing Bot (c) 2022-2024 by Christian Schüler, christianschueler.at

// Selects the GPIO implementation: real hardware via onoff on a Raspberry Pi, a no-op stub everywhere else.
// Note: only checking onoff's Gpio.accessible is not enough, since normal PCs may also expose
// /sys/class/gpio (e.g. AMD/Intel chipset GPIOs) and we must never toggle those.

import * as fs from 'fs';
import type { Gpio as OnoffGpio } from 'onoff';
import { Gpio as StubGpio } from './Gpio.js';

function isRaspberryPi(): boolean {
	try {
		return fs.readFileSync('/proc/device-tree/model', 'utf8').includes('Raspberry Pi');
	} catch {
		return false;
	}
}

let GpioImpl: typeof OnoffGpio;

if (isRaspberryPi()) {
	// load onoff (and its native epoll dependency) only on the Pi
	GpioImpl = (await import('onoff')).Gpio;
} else {
	console.log('Not running on a Raspberry Pi - using GPIO stub (development mode).');
	GpioImpl = StubGpio as unknown as typeof OnoffGpio;
}

export const Gpio = GpioImpl;
export type Gpio = OnoffGpio;
