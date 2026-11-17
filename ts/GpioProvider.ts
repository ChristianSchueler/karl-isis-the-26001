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

// Since kernel 6.6 the sysfs GPIO numbers of the Pi's header GPIO chip no longer start at 0,
// but at a dynamically assigned base (e.g. 512 on Pi 1-4, ~569 on Pi 5 with the RP1 chip).
// Exporting the plain BCM number then fails with EINVAL (-22). Determine the base at startup,
// so the rest of the code can keep using BCM numbers. Falls back to 0 (old kernels).
function piGpioBase(): number {
	const sysfs = '/sys/class/gpio';
	try {
		for (const entry of fs.readdirSync(sysfs)) {
			if (!entry.startsWith('gpiochip')) continue;
			const label = fs.readFileSync(`${sysfs}/${entry}/label`, 'utf8').trim();
			if (/^pinctrl-(rp1|bcm2835|bcm2711)$/.test(label)) {
				return parseInt(fs.readFileSync(`${sysfs}/${entry}/base`, 'utf8').trim(), 10);
			}
		}
	} catch (e) {
		console.log('Could not determine GPIO chip base:', e);
	}
	return 0;
}

let GpioImpl: typeof OnoffGpio;

if (isRaspberryPi()) {
	// load onoff (and its native epoll dependency) only on the Pi
	const OnoffGpioClass = (await import('onoff')).Gpio;
	const base = piGpioBase();
	console.log(`GPIO chip base: ${base}`);

	// translates BCM numbers to sysfs numbers, everything else is plain onoff
	class PiGpio extends OnoffGpioClass {
		constructor(gpio: number, ...rest: any[]) {
			super(gpio + base, ...(rest as [any]));
		}
	}
	GpioImpl = PiGpio as unknown as typeof OnoffGpio;
} else {
	console.log('Not running on a Raspberry Pi - using GPIO stub (development mode).');
	GpioImpl = StubGpio as unknown as typeof OnoffGpio;
}

export const Gpio = GpioImpl;
export type Gpio = OnoffGpio;
