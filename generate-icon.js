// generate-icon.js - 运行此脚本生成 icon.png（需要 Node.js + canvas 库）
// 如不想安装依赖，直接用任意 48x48 PNG 图片命名为 icon.png

// 简易方法：用下面的 base64 PNG（蓝色背景带 </> 图标）
const fs = require('fs');

// 1x1 蓝色像素的 base64（仅占位，替换为真实图标）
// 推荐使用 https://favicon.io 生成真实图标
const placeholder = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
  'B3RJTUUH6AQHBiYsK+PXMQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUH' +
  'AAAAFElEQVRo3mNgYGD4z8BQDwAEAAH/Ar4AAAAASUVORK5CYII=',
  'base64'
);

// 如果你的环境有 canvas，用下面这段真正生成图标：
try {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  // 背景
  ctx.fillStyle = '#1a73e8';
  ctx.beginPath();
  ctx.roundRect(0, 0, 128, 128, 16);
  ctx.fill();
  // 文字
  ctx.fillStyle = 'white';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('</>', 64, 68);
  fs.writeFileSync('icon.png', canvas.toBuffer('image/png'));
  console.log('icon.png 生成成功');
} catch(e) {
  fs.writeFileSync('icon.png', placeholder);
  console.log('已生成占位 icon.png，建议替换为真实图标');
}
