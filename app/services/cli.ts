import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULE_VERSION = "cowsay:v0.0.4";

// Function to generate an image buffer from ASCII text
async function createImageBufferFromAscii(asciiText, aspectRatio = 1.91) {
  const fontSize = 14;
  const lineHeight = fontSize + 6;
  const padding = 20;

  const lines = asciiText.split('\\n');

  const textHeight = lines.length * lineHeight + padding * 2;

  let width, height;
  if (aspectRatio === 1.91) {
    width = Math.max(textHeight * aspectRatio, 800);
    height = textHeight;
  } else if (aspectRatio === 1) {
    width = height = Math.max(textHeight, 800);
  }

  const escapeXML = (unsafe) => {
    return unsafe.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const escapedLines = lines.map(line => escapeXML(line));

  const textWidth = Math.max(...escapedLines.map(line => line.length)) * fontSize * 0.6;
  const xPosition = Math.max((width - textWidth) / 2, 10);

  // Generate SVG markup with the ASCII content
  const svgImage = `
    <svg width="${width}" height="${height}" xmlns="<http://www.w3.org/2000/svg>">
      <rect width="100%" height="100%" fill="white" />
      <style>
        .text-content { font-family: monospace; font-size: ${fontSize}px; fill: black; white-space: pre; }
      </style>
      <text x="${xPosition}" y="${padding}" class="text-content">
        ${escapedLines.map((line, index) => `<tspan x="${xPosition}" dy="${index === 0 ? '0' : lineHeight}">${line}</tspan>`).join('')}
      </text>
    </svg>
  `;

  // Convert the SVG to a PNG image buffer using sharp
  return sharp(Buffer.from(svgImage)).png().toBuffer();
}

// Function to run the Lilypad CLI command
export async function runCliCommand(inputs) {
  console.log("Lilypad Starting...");

  const web3PrivateKey = process.env.WEB3_PRIVATE_KEY;
  if (!web3PrivateKey) {
    throw new Error('WEB3_PRIVATE_KEY is not set in the environment variables.');
  }

  // Construct the command to run Lilypad with the user input
  const command = `lilypad run ${MODULE_VERSION} -i Message="${inputs}"`;
  console.log("Command to be executed:", command);

  // Execute the command as a shell process
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', `export WEB3_PRIVATE_KEY=${web3PrivateKey} && ${command}`]);

    let stdoutData = '';
    let stderrData = '';

    // Capture stdout from the CLI command
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`Stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Stderr: ${data}`);
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
        return;
      }

      if (stderrData) {
        reject(new Error(stderrData));
        return;
      }

      console.log("Process completed successfully!");

      try {
        // Extracts the file path, reads the ASCII content and converts it to an image buffer
        const stdoutFilePath = extractStdoutFilePath(stdoutData);
        const asciiContent = await fs.readFile(stdoutFilePath, 'utf-8');
        const imageBuffer = await createImageBufferFromAscii(asciiContent);
        resolve(imageBuffer);
      } catch (error) {
        reject(new Error(`Error processing output: ${error.message}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Error with spawning process: ${error.message}`));
    });
  });
}

// Helper function to extract the stdout file path from the CLI output
function extractStdoutFilePath(stdoutData) {
  const match = stdoutData.match(/cat (\/tmp\/lilypad\/data\/downloaded-files\/\w+\/stdout)/);
  if (!match || !match[1]) {
    throw new Error('Stdout file path not found in CLI output');
  }
  return match[1];
}