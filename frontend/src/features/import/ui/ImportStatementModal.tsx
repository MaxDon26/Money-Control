import { useState } from 'react';
import {
  Modal,
  Upload,
  Select,
  Button,
  Alert,
  Typography,
  Space,
  Statistic,
  Row,
  Col,
  Divider,
  Spin,
} from 'antd';
import { InboxOutlined, CheckCircleOutlined, BankOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UploadFile } from 'antd/es/upload/interface';
import { importApi, ImportResult, DetectAccountResult } from '@/shared/api';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  bankName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

export function ImportStatementModal({ open, onClose, accounts }: Props) {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<DetectAccountResult | null>(null);

  const detectMutation = useMutation({
    mutationFn: (file: File) => importApi.detectAccount(file),
    onSuccess: (data) => {
      setDetectedInfo(data);
      // Auto-select matched account if found
      if (data.matchedAccountId) {
        setSelectedAccountId(data.matchedAccountId);
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ accountId, file }: { accountId: string; file: File }) =>
      importApi.importStatement(accountId, file),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    const newFileList = info.fileList.slice(-1);
    setFileList(newFileList);

    // Reset detection and selection when file changes
    setDetectedInfo(null);
    setSelectedAccountId(null);

    // Auto-detect account from file
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      detectMutation.mutate(newFileList[0].originFileObj as File);
    }
  };

  const handleImport = () => {
    if (!selectedAccountId || fileList.length === 0) return;
    const file = fileList[0].originFileObj as File;
    importMutation.mutate({ accountId: selectedAccountId, file });
  };

  const handleClose = () => {
    setResult(null);
    setFileList([]);
    setSelectedAccountId(null);
    setDetectedInfo(null);
    importMutation.reset();
    detectMutation.reset();
    onClose();
  };

  const renderDetectionInfo = () => {
    if (detectMutation.isPending) {
      return (
        <Alert
          type="info"
          message={
            <Space>
              <Spin size="small" />
              <span>Определяем банк и счёт...</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      );
    }

    if (!detectedInfo) return null;

    const { bankName, accountNumber, matchedAccountId, matchedAccountName } = detectedInfo;

    if (matchedAccountId) {
      return (
        <Alert
          type="success"
          message={`Выписка ${bankName}`}
          description={
            <Space direction="vertical" size={0}>
              <span>Номер счёта: {accountNumber}</span>
              <span>Найден счёт: <strong>{matchedAccountName}</strong></span>
            </Space>
          }
          icon={<BankOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }

    if (accountNumber) {
      return (
        <Alert
          type="warning"
          message={`Выписка ${bankName}`}
          description={
            <Space direction="vertical" size={0}>
              <span>Номер счёта: {accountNumber}</span>
              <span>Совпадений не найдено. Выберите счёт вручную.</span>
            </Space>
          }
          icon={<BankOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }

    return (
      <Alert
        type="info"
        message={`Выписка ${bankName}`}
        description="Номер счёта не найден в выписке. Выберите счёт вручную."
        icon={<BankOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div style={{ textAlign: 'center' }}>
        <CheckCircleOutlined
          style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }}
        />
        <Title level={4}>Импорт завершён!</Title>
        <Text type="secondary">Банк: {result.bankName}</Text>

        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={12}>
            <Statistic
              title="Импортировано"
              value={result.imported}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Пропущено (дубли)"
              value={result.skipped}
              valueStyle={{ color: '#999' }}
            />
          </Col>
        </Row>

        {result.categorization && (
          <>
            <Divider>Категоризация</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="По ключевым словам"
                  value={result.categorization.byKeywords}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Через AI"
                  value={result.categorization.byAi}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="По умолчанию"
                  value={result.categorization.byDefault}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
          </>
        )}
      </div>
    );
  };

  return (
    <Modal
      title="Импорт банковской выписки"
      open={open}
      onCancel={handleClose}
      width={500}
      footer={
        result ? (
          <Button type="primary" onClick={handleClose}>
            Готово
          </Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>Отмена</Button>
            <Button
              type="primary"
              onClick={handleImport}
              loading={importMutation.isPending}
              disabled={!selectedAccountId || fileList.length === 0}
            >
              Импортировать
            </Button>
          </Space>
        )
      }
    >
      {result ? (
        renderResult()
      ) : (
        <>
          <Dragger
            accept=".csv,.pdf"
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            maxCount={1}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Нажмите или перетащите файл выписки
            </p>
            <p className="ant-upload-hint">
              Поддерживаются: Тинькофф, Сбербанк (PDF, CSV)
            </p>
          </Dragger>

          {renderDetectionInfo()}

          <Select
            placeholder="Выберите счёт для импорта"
            style={{ width: '100%' }}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            options={accounts.map((a) => ({
              label: a.bankName ? `${a.name} (${a.bankName})` : a.name,
              value: a.id,
            }))}
          />

          {importMutation.isError && (
            <Alert
              type="error"
              message="Ошибка импорта"
              description={
                (importMutation.error as Error & { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ||
                (importMutation.error as Error)?.message ||
                'Произошла ошибка при импорте'
              }
              style={{ marginTop: 16 }}
              showIcon
            />
          )}
        </>
      )}
    </Modal>
  );
}
