import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Alert, Space, Typography } from 'antd';
import { CameraOutlined, ReloadOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { parseFiscalQr, isFiscalQr, FiscalQrData } from '../lib/parse-fiscal-qr';

const { Text } = Typography;

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: FiscalQrData) => void;
}

const QR_READER_ID = 'qr-reader-container';

export function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {
        // Ignore cleanup errors
      }
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    const container = document.getElementById(QR_READER_ID);
    if (!container || scannerRef.current) return;

    setError(null);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (!isMountedRef.current) return;

          // Проверяем, фискальный ли это QR
          if (!isFiscalQr(decodedText)) {
            setError('QR-код не содержит данные чека. Отсканируйте QR-код с чека.');
            return;
          }

          const parsed = parseFiscalQr(decodedText);
          if (!parsed) {
            setError('Не удалось распознать данные чека');
            return;
          }

          // Успешно — останавливаем и передаём
          stopScanner().then(() => {
            onScan(parsed);
            onClose();
          });
        },
        () => {
          // Ошибка декодирования — продолжаем сканировать
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      scannerRef.current = null;

      if (!isMountedRef.current) return;
      setIsScanning(false);

      if (err instanceof Error) {
        if (err.message.includes('Permission')) {
          setError('Доступ к камере запрещён. Разрешите доступ в настройках браузера.');
        } else if (err.message.includes('NotFound')) {
          setError('Камера не найдена на устройстве.');
        } else {
          setError(`Ошибка камеры: ${err.message}`);
        }
      } else {
        setError('Не удалось запустить камеру');
      }
    }
  }, [onClose, onScan, stopScanner]);

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [onClose, stopScanner]);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Start scanner when modal opens and container is ready
  useEffect(() => {
    if (open && isReady) {
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, isReady, startScanner]);

  // Stop scanner when modal closes
  useEffect(() => {
    if (!open) {
      stopScanner();
      setIsReady(false);
      setError(null);
    }
  }, [open, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          <span>Сканировать чек</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          {error && (
            <Button icon={<ReloadOutlined />} onClick={startScanner}>
              Повторить
            </Button>
          )}
          <Button onClick={handleClose}>Отмена</Button>
        </Space>
      }
      width={400}
      afterOpenChange={(visible) => {
        if (visible) {
          setIsReady(true);
        }
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {error ? (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Наведите камеру на QR-код чека
          </Text>
        )}

        <div
          id={QR_READER_ID}
          style={{
            width: '100%',
            minHeight: 300,
            background: '#f5f5f5',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        />

        {!isScanning && !error && (
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            Запуск камеры...
          </Text>
        )}
      </div>
    </Modal>
  );
}
