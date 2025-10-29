
import React from 'react';
import type { AppSettings } from '../types';
import Modal from './Modal';
import { ChevronDownIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
  <div className="p-4 bg-gray-700 rounded-lg">
    <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const FormField: React.FC<{ label: string; description?: string; children: React.ReactNode; htmlFor?: string; }> = ({ label, description, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300">{label}</label>
    <div className="mt-1">{children}</div>
    {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
  </div>
);

const SliderInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; }> = ({ label, value, onChange, min = 0, max = 1, step = 0.1 }) => (
  <FormField label={label}>
    <div className="flex items-center space-x-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 bg-gray-800 border-gray-600 rounded-md p-1 text-center text-white"
      />
    </div>
  </FormField>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
  
  const handleAiChange = <K extends keyof AppSettings['ai']>(key: K, value: AppSettings['ai'][K]) => {
    setSettings(prev => ({ ...prev, ai: { ...prev.ai, [key]: value } }));
  };

  const handleVendorSettingChange = <K extends keyof AppSettings['ai']['vendors']['gemini']>(key: K, value: AppSettings['ai']['vendors']['gemini'][K]) => {
    setSettings(prev => {
        const newSettings = { ...prev };
        const activeVendor = newSettings.ai.activeVendor;
        (newSettings.ai.vendors[activeVendor] as any)[key] = value;
        return newSettings;
    });
  };
  
  const handleAdvancedChange = <K extends keyof AppSettings['ai']['vendors']['gemini']['advanced']>(key: K, value: AppSettings['ai']['vendors']['gemini']['advanced'][K]) => {
     setSettings(prev => {
        const newSettings = { ...prev };
        const activeVendor = newSettings.ai.activeVendor;
        (newSettings.ai.vendors[activeVendor].advanced as any)[key] = value;
        return newSettings;
    });
  };

  const { ai } = settings;
  const activeVendorSettings = ai.vendors[ai.activeVendor];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置">
      <div className="space-y-6 text-gray-300">
        <Section title="AI 助手">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-toggle" className="flex flex-col cursor-pointer pr-4">
              <span className="font-medium">启用 AI 功能</span>
              <span className="text-sm text-gray-400">允许应用使用 AI API 生成创意。</span>
            </label>
            <button
              id="ai-toggle"
              role="switch"
              aria-checked={ai.enabled}
              onClick={() => handleAiChange('enabled', !ai.enabled)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 flex-shrink-0 ${
                ai.enabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  ai.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </Section>
        
        {ai.enabled && (
          <>
            <Section title="基本设置">
              <FormField label="厂商" htmlFor="ai-vendor">
                <div className="relative">
                    <select 
                      id="ai-vendor" 
                      value={ai.activeVendor} 
                      onChange={e => handleAiChange('activeVendor', e.target.value as 'gemini' | 'openai')}
                      className="appearance-none block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                    <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
              </FormField>
              <FormField label="模型" htmlFor="ai-model">
                <input id="ai-model" type="text" value={activeVendorSettings.model} onChange={e => handleVendorSettingChange('model', e.target.value)} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </FormField>
              <FormField label="系统提示词" htmlFor="ai-system-prompt">
                <textarea id="ai-system-prompt" value={activeVendorSettings.systemPrompt} onChange={e => handleVendorSettingChange('systemPrompt', e.target.value)} rows={4} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </FormField>
                <FormField label="API 地址" htmlFor="ai-base-url">
                <input id="ai-base-url" type="text" value={activeVendorSettings.baseUrl} onChange={e => handleVendorSettingChange('baseUrl', e.target.value)} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </FormField>
              <FormField label="API Key" htmlFor="ai-api-key">
                <input id="ai-api-key" type="password" value={activeVendorSettings.apiKey} onChange={e => handleVendorSettingChange('apiKey', e.target.value)} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white font-mono focus:ring-indigo-500 focus:border-indigo-500" />
              </FormField>
            </Section>

            <Section title="高级设置">
                <SliderInput label="Temperature" value={activeVendorSettings.advanced.temperature} onChange={v => handleAdvancedChange('temperature', v)} min={0} max={ai.activeVendor === 'openai' ? 2 : 1} step={0.1} />
                <SliderInput label="Top-P" value={activeVendorSettings.advanced.topP} onChange={v => handleAdvancedChange('topP', v)} min={0} max={1} step={0.1} />
                {ai.activeVendor === 'gemini' && activeVendorSettings.advanced.topK !== undefined && (
                    <FormField label="Top-K">
                        <input type="number" value={activeVendorSettings.advanced.topK} onChange={e => handleAdvancedChange('topK', parseInt(e.target.value, 10))} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white"/>
                    </FormField>
                )}
                <FormField label="最大输出令牌 (Max Tokens)">
                    <input type="number" value={activeVendorSettings.advanced.maxOutputTokens} onChange={e => handleAdvancedChange('maxOutputTokens', parseInt(e.target.value, 10))} className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white"/>
                </FormField>
            </Section>
          </>
        )}
      </div>
      <div className="flex justify-end pt-6 mt-4 border-t border-gray-700">
        <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          完成
        </button>
      </div>
    </Modal>
  );
};

export default SettingsModal;
