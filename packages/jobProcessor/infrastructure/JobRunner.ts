import { spawn } from "child_process";
import { IJobRunner } from "../domain/jobProcessorTypes";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPT_PATH = 'job_cpp.sh'

export default class JobRunner implements IJobRunner {
    async run(jobName: string, args: string[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const child = spawn(`${__dirname}/${SCRIPT_PATH}`, [jobName, ...args], {
                stdio: 'inherit',
            });

            child.on('error', reject);

            child.on('exit', code => {
                if (code === 0) {
                    resolve(0)
                } else if (code === 1) {
                    resolve(1)
                } else {
                    reject(new Error(`Unknown exit code: ${code}`))
                }
            });
        });
    }
}