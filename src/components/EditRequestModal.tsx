import React, { useState, useEffect } from 'react';
import { X, CheckCircle, User, Lock, Check } from 'lucide-react';
import { VideoRequest, MajorCategory } from '../types';

interface EditRequestModalProps {
  request: VideoRequest | null;
  categories: MajorCategory[];
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: VideoRequest) => void;
}

const PRODUCER_OPTIONS = [
  { name: '민규', activeBg: 'bg-[#5A92BF] text-white border-[#5A92BF]' },
  { name: '신혜', activeBg: 'bg-[#4F8A6B] text-white border-[#4F8A6B]' },
  { name: '유진', activeBg: 'bg-[#D87AC6] text-white border-[#D87AC6]' },
  { name: '승아', activeBg: 'bg-[#A39B53] text-white border-[#A39B53]' },
  { name: '외주', activeBg: 'bg-[#181715] text-[#EAE2D3] border-[#181715]' },
] as const;

const parseSubCategoriesWithCounts = (
  raw: string | undefined
): { names: string[]; countInputs: Record<string, string> } => {
  if (!raw) return { names: [], countInputs: {} };
  const countInputs: Record<string, string> = {};
  const names = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const compMatch = token.match(/^구성 추가\((\d+)개\)$/);
      if (compMatch) {
        const count = parseInt(compMatch[1], 10);
        if (!isNaN(count) && count > 1) {
          countInputs['구성 추가'] = String(Math.min(99, count));
        }
        return '구성 추가';
      }
      const shootMatch = token.match(/^촬영\((\d+)일\)$/);
      if (shootMatch) {
        const count = parseInt(shootMatch[1], 10);
        if (!isNaN(count) && count > 1) {
          countInputs['촬영'] = String(Math.min(99, count));
        }
        return '촬영';
      }
      return token;
    });
  return { names, countInputs };
};

const stripParens = (val: string | undefined, fallback: string): string => {
  if (!val) return fallback;
  const cleaned = val.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned || val;
};

const STANDARD_ASPECT_RATIOS = ['16:9 가로형', '9:16 세로형', '1:1 정방형', '다중 포맷'];
const STANDARD_TARGET_LENGTHS = ['15초~30초', '30초~60초', '60초~90초', '2분~3분', '5분 이상'];

export const EditRequestModal: React.FC<EditRequestModalProps> = ({
  request,
  categories,
  isAdmin,
  isOpen,
  onClose,
  onSave,
}) => {
  const initialParsedSubs = parseSubCategoriesWithCounts(request?.subCategory);
  const [headquarters, setHeadquarters] = useState<string>(request?.headquarters || '');
  const [team, setTeam] = useState<string>(request?.team || '');
  const [requesterName, setRequesterName] = useState<string>(request?.requesterName || '');
  const [majorCategory, setMajorCategory] = useState<string>(request?.majorCategory || '');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    initialParsedSubs.names
  );
  const [subCountInputs, setSubCountInputs] = useState<Record<string, string>>(
    initialParsedSubs.countInputs
  );
  const [taskName, setTaskName] = useState<string>(request?.taskName || '');
  const [requiredDays, setRequiredDays] = useState<number>(Math.round(request?.requiredDays || 1));
  const [dueDate, setDueDate] = useState<string>(request?.dueDate || '');
  const [aspectRatio, setAspectRatio] = useState<string>(
    stripParens(request?.aspectRatio, '16:9 가로형')
  );
  const [targetLength, setTargetLength] = useState<string>(
    stripParens(request?.targetLength, '60초~90초')
  );
  const [notes, setNotes] = useState<string>(request?.notes || '');
  const [assignedProducer, setAssignedProducer] = useState<string>(request?.assignedProducer || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isQuantifiableSub = (name: string) => name === '구성 추가' || name === '촬영';
  const getSubQuantityUnit = (name: string) => (name === '촬영' ? '일' : '개');
  const getSubQuantityLabel = (name: string) =>
    name === '촬영' ? '촬영 일수 (미입력 시 1일)' : '개수 (미입력 시 1개)';

  const getEffectiveSubCount = (name: string, inputs: Record<string, string>): number => {
    if (!isQuantifiableSub(name)) return 1;
    const parsed = parseInt(inputs[name] || '', 10);
    return !isNaN(parsed) && parsed > 0 ? Math.min(99, parsed) : 1;
  };

  const calcTotalRequiredDays = (
    majorObj: MajorCategory | undefined,
    selectedNames: string[],
    inputs: Record<string, string>
  ): number => {
    if (!majorObj) return 0;
    return Math.round(
      majorObj.subcategories
        .filter((s) => selectedNames.includes(s.name))
        .reduce((sum, s) => {
          const qty = getEffectiveSubCount(s.name, inputs);
          return sum + (Number(s.defaultDays) || 0) * qty;
        }, 0)
    );
  };

  useEffect(() => {
    if (request) {
      const parsedSubs = parseSubCategoriesWithCounts(request.subCategory);
      setHeadquarters(request.headquarters);
      setTeam(request.team);
      setRequesterName(request.requesterName);
      setMajorCategory(request.majorCategory);
      setSelectedSubCategories(parsedSubs.names);
      setSubCountInputs(parsedSubs.countInputs);
      setTaskName(request.taskName);
      setRequiredDays(Math.round(request.requiredDays));
      setDueDate(request.dueDate);
      setAspectRatio(stripParens(request.aspectRatio, '16:9 가로형'));
      setTargetLength(stripParens(request.targetLength, '60초~90초'));
      setNotes(request.notes || '');
      setAssignedProducer(request.assignedProducer || '');
      setNewPassword('');
      setErrorMsg('');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const currentMajorObj = categories.find((c) => c.name === majorCategory);

  const handleMajorCategoryChange = (newMajor: string) => {
    setMajorCategory(newMajor);
    setSubCountInputs({});
    const majorObj = categories.find((c) => c.name === newMajor);
    if (majorObj && majorObj.subcategories.length > 0) {
      const firstSub = majorObj.subcategories[0];
      setSelectedSubCategories([firstSub.name]);
      setRequiredDays(Math.round(firstSub.defaultDays));
    } else {
      setSelectedSubCategories([]);
    }
  };

  const handleToggleSubCategory = (subName: string) => {
    if (!currentMajorObj) return;
    const isAlreadySelected = selectedSubCategories.includes(subName);
    const nextRaw = isAlreadySelected
      ? selectedSubCategories.filter((name) => name !== subName)
      : [...selectedSubCategories, subName];

    let nextInputs = subCountInputs;
    if (isAlreadySelected && isQuantifiableSub(subName)) {
      const updated = { ...subCountInputs };
      delete updated[subName];
      nextInputs = updated;
      setSubCountInputs(updated);
    }

    const nextOrdered = currentMajorObj.subcategories
      .filter((s) => nextRaw.includes(s.name))
      .map((s) => s.name);

    const totalDays = calcTotalRequiredDays(currentMajorObj, nextOrdered, nextInputs);

    setSelectedSubCategories(nextOrdered);
    if (nextOrdered.length > 0) {
      setRequiredDays(totalDays);
    } else if (!isAdmin) {
      setRequiredDays(0);
    }
  };

  const handleSubCountChange = (subName: string, rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '');
    const nextInputs = { ...subCountInputs, [subName]: digitsOnly };
    setSubCountInputs(nextInputs);
    const totalDays = calcTotalRequiredDays(currentMajorObj, selectedSubCategories, nextInputs);
    if (selectedSubCategories.length > 0) {
      setRequiredDays(totalDays);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!headquarters.trim()) {
      setErrorMsg('소속 본부를 입력해 주세요.');
      return;
    }
    if (!team.trim()) {
      setErrorMsg('소속 팀을 입력해 주세요.');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMsg('담당자 성함을 입력해 주세요.');
      return;
    }
    if (!taskName.trim()) {
      setErrorMsg('업무명을 입력해 주세요.');
      return;
    }
    if (selectedSubCategories.length === 0) {
      setErrorMsg('소분류를 1개 이상 선택해 주세요.');
      return;
    }
    if (requiredDays <= 0) {
      setErrorMsg('업무 소요일은 1일 이상이어야 합니다.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('희망 완료일을 입력해 주세요.');
      return;
    }

    const formattedSubCategories = selectedSubCategories.map((name) => {
      const qty = getEffectiveSubCount(name, subCountInputs);
      return isQuantifiableSub(name) && qty > 1
        ? `${name}(${qty}${getSubQuantityUnit(name)})`
        : name;
    });

    const updatedRequest: VideoRequest = {
      ...request,
      headquarters: headquarters.trim(),
      team: team.trim(),
      requesterName: requesterName.trim(),
      majorCategory,
      subCategory: formattedSubCategories.join(', ').slice(0, 100),
      taskName: taskName.trim(),
      requiredDays: Math.round(requiredDays),
      dueDate,
      aspectRatio,
      targetLength,
      notes: notes.trim(),
      assignedProducer: isAdmin ? assignedProducer.trim() : request.assignedProducer,
      password: newPassword.trim() ? newPassword.trim() : request.password,
    };

    onSave(updatedRequest);
    onClose();
  };

  const inputClass =
    'w-full text-xs rounded-[3px] border border-[#181715]/25 bg-[#FCF9F3] p-2 text-[#181715] placeholder-[#8A8275] focus:border-[#181715] focus:bg-white focus:outline-none transition-colors';

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#181715]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full my-auto bg-[#FAF7F0] rounded-[4px] shadow-[0_24px_60px_rgba(24,23,21,0.25)] border border-[#181715]/20 max-h-[85vh] flex flex-col overflow-hidden text-[#181715]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#EFE8DA] text-[#181715] border-b border-[#181715]/15 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-[#181715] text-[#FAF7F0] font-bold">
                  {request.id}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight">접수 내역 수정</h3>
              {isAdmin && (
                <span className="text-[10px] bg-[#E94B22] text-white px-1.5 py-0.5 rounded-[2px] font-bold">
                  관리자 권한 수정
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5F5A52] mt-0.5">
              요청 업무의 내용 및 세부사항을 수정하고 저장합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[3px] text-[#5F5A52] hover:text-[#181715] hover:bg-[#181715]/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-[#E94B22]/12 border border-[#E94B22] text-[#181715] text-xs font-semibold rounded-[3px]">
                {errorMsg}
              </div>
            )}

            {/* Department & Requester */}
            <div>
              <span className="text-xs font-extrabold text-[#181715] tracking-tight flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[11px] text-[#E94B22]">01 /</span>
                <span>의뢰 부서 및 담당자</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                    소속 본부 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 나눔참여본부"
                    value={headquarters}
                    onChange={(e) => setHeadquarters(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                    소속 팀 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 콘텐츠UX팀"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                    담당자 성함 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김월비"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category & Days */}
            <div className="pt-3.5 border-t border-[#181715]/15">
              <span className="text-xs font-extrabold text-[#181715] tracking-tight flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[11px] text-[#E94B22]">02 /</span>
                <span>영상 분류 및 소요일</span>
              </span>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                      대분류 *
                    </label>
                    <select
                      value={majorCategory}
                      onChange={(e) => handleMajorCategoryChange(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                      업무 소요일 (일){' '}
                      {isAdmin && <span className="text-[#E94B22] font-bold">(직접 변경)</span>}
                    </label>
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          value={requiredDays}
                          onChange={(e) =>
                            setRequiredDays(Math.max(1, Math.round(Number(e.target.value) || 1)))
                          }
                          className="w-full text-xs font-mono font-bold rounded-[3px] border border-[#E94B22]/60 bg-[#FCF9F3] p-2 focus:border-[#181715] focus:outline-none text-[#181715]"
                          required
                        />
                        <span className="text-xs text-[#5F5A52] shrink-0">일</span>
                      </div>
                    ) : (
                      <div className="p-2 bg-[#EAE2D3] rounded-[3px] border border-[#181715]/15 text-xs font-mono font-bold text-[#181715]">
                        {Math.round(requiredDays)}일 소요
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#5F5A52]">
                      소분류 (같은 대분류 내 복수 선택 가능) *
                    </label>
                    <span className="font-mono text-[10px] font-bold text-[#181715]">
                      {selectedSubCategories.length}개 선택됨
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentMajorObj?.subcategories.map((s) => {
                      const isChecked = selectedSubCategories.includes(s.name);
                      const isQuantifiable = isQuantifiableSub(s.name);
                      const subQty = isChecked ? getEffectiveSubCount(s.name, subCountInputs) : 1;
                      const subTotalDays = Math.round((Number(s.defaultDays) || 0) * subQty);

                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleToggleSubCategory(s.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleSubCategory(s.name);
                            }
                          }}
                          aria-pressed={isChecked}
                          className={`text-left px-2.5 py-2 rounded-[3px] border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-[#EFE8DA] border-[#181715] text-[#181715]'
                              : 'bg-[#FCF9F3] border-[#181715]/20 text-[#181715] hover:bg-[#EFE8DA]/55'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${
                                  isChecked
                                    ? 'bg-[#181715] border-[#181715] text-[#EAE2D3]'
                                    : 'bg-white border-[#181715]/30'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="text-xs font-semibold truncate">{s.name}</span>
                            </span>
                            <span className="font-mono text-[11px] font-bold text-[#E94B22] shrink-0">
                              {subTotalDays}일
                            </span>
                          </div>
                          {isChecked && isQuantifiable && (
                            <div
                              className="mt-2 pt-1.5 border-t border-[#181715]/12 flex items-center justify-between gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-semibold text-[#5F5A52]">
                                {getSubQuantityLabel(s.name)}
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  step={1}
                                  placeholder="1"
                                  value={subCountInputs[s.name] || ''}
                                  onChange={(e) => handleSubCountChange(s.name, e.target.value)}
                                  className="w-12 text-center font-mono text-[11px] font-bold rounded-[2px] border border-[#181715]/30 bg-white px-1 py-0.5 text-[#181715] focus:border-[#181715] focus:outline-none"
                                />
                                <span className="text-[10px] font-semibold text-[#181715]">
                                  {getSubQuantityUnit(s.name)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Task Name & Due Date */}
            <div className="pt-3.5 border-t border-[#181715]/15">
              <span className="text-xs font-extrabold text-[#181715] tracking-tight flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[11px] text-[#E94B22]">03 /</span>
                <span>업무명 및 희망 완료일</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                    업무명 (영상 프로젝트 명) *
                  </label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className={`${inputClass} font-semibold`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                    희망 완료일 *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${inputClass} font-mono`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Ratio & Length */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  화면 비율
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {!STANDARD_ASPECT_RATIOS.includes(aspectRatio) && aspectRatio && (
                    <option value={aspectRatio}>{aspectRatio}</option>
                  )}
                  <option value="16:9 가로형">16:9 가로형</option>
                  <option value="9:16 세로형">9:16 세로형</option>
                  <option value="1:1 정방형">1:1 정방형</option>
                  <option value="다중 포맷">다중 포맷</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  예상 분량
                </label>
                <select
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {!STANDARD_TARGET_LENGTHS.includes(targetLength) && targetLength && (
                    <option value={targetLength}>{targetLength}</option>
                  )}
                  <option value="15초~30초">15초~30초</option>
                  <option value="30초~60초">30초~60초</option>
                  <option value="60초~90초">60초~90초</option>
                  <option value="2분~3분">2분~3분</option>
                  <option value="5분 이상">5분 이상</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                상세 요청사항 및 참고 링크
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
                placeholder="세부 작업 내용 및 참고 링크를 입력해주세요."
              />
            </div>

            {/* Admin only: Producer assignment */}
            {isAdmin && (
              <div className="p-3.5 bg-[#EAE2D3]/70 rounded-[3px] border border-[#181715]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#181715] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#5F5A52]" />
                    <span>배정 담당자 (민규, 신혜, 유진, 승아, 외주)</span>
                  </label>
                  {assignedProducer && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#181715] text-[#EAE2D3]">
                      ✓ {assignedProducer}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCER_OPTIONS.map((opt) => {
                    const isSelected = assignedProducer === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setAssignedProducer(isSelected ? '' : opt.name)}
                        className={`px-2.5 py-1 rounded-[2px] text-xs border transition-colors cursor-pointer font-semibold ${
                          isSelected
                            ? opt.activeBg
                            : 'bg-[#FCF9F3] text-[#181715] border-[#181715]/20 hover:bg-[#EAE2D3]'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="담당자 이름 직접 입력..."
                  value={assignedProducer}
                  onChange={(e) => setAssignedProducer(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {/* Password change option */}
            <div className="pt-3.5 border-t border-[#181715]/15">
              <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#5F5A52]" />
                <span>새 비밀번호 변경 (선택사항)</span>
              </label>
              <input
                type="password"
                placeholder="비밀번호를 변경하려면 새 비밀번호를 입력하세요 (미입력 시 기존 비밀번호 유지)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-[#EFE8DA] border-t border-[#181715]/15 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5F5A52] hover:text-[#181715] hover:bg-[#181715]/8 rounded-[3px] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-[#EAE2D3] bg-[#181715] hover:bg-[#E94B22] hover:text-white rounded-[3px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>수정 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
