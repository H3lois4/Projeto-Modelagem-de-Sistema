/**
 * resize.js — Utilitário de redimensionamento de imagem
 *
 * Usa Canvas API para redimensionar imagens antes do upload.
 * - Max 1200px na maior dimensão, mantendo proporção
 * - Comprime como JPEG com qualidade 80%
 * - Não amplia imagens já menores que 1200px
 *
 * Requisitos: 13.1, 13.2
 */
(function () {
  'use strict';

  /**
   * Redimensiona uma imagem mantendo proporção e comprime como JPEG.
   *
   * @param {File|Blob} file - Arquivo de imagem a redimensionar
   * @param {number} [maxDimension=1200] - Dimensão máxima em pixels
   * @param {number} [quality=0.8] - Qualidade JPEG (0 a 1)
   * @returns {Promise<Blob>} Blob da imagem redimensionada (JPEG)
   */
  function resizeImage(file, maxDimension, quality) {
    if (maxDimension === undefined || maxDimension === null) maxDimension = 1200;
    if (quality === undefined || quality === null) quality = 0.8;

    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('Nenhum arquivo fornecido'));
        return;
      }

      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(url);

        var origW = img.naturalWidth;
        var origH = img.naturalHeight;

        // Don't upscale: if both dimensions are already within limit, return original
        if (origW <= maxDimension && origH <= maxDimension) {
          resolve(file);
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        var newW, newH;
        if (origW >= origH) {
          newW = maxDimension;
          newH = Math.round((origH / origW) * maxDimension);
        } else {
          newH = maxDimension;
          newW = Math.round((origW / origH) * maxDimension);
        }

        // Draw on canvas at new dimensions
        var canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newW, newH);

        // Export as JPEG with specified quality
        canvas.toBlob(
          function (blob) {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erro ao comprimir imagem'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar imagem para redimensionamento'));
      };

      img.src = url;
    });
  }

  // Expose globally
  window.resizeImage = resizeImage;
})();
