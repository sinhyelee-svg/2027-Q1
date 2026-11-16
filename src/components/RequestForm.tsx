import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  User,
  Layers,
  ShieldAlert,
  HelpCircle,
  X,
  Lock,
  Check,
} from 'lucide-react';
import { MajorCategory, VideoRequest, QuarterConfig } from '../types';

interface RequestFormProps {
  categories: MajorCategory[];
  currentQuarter: QuarterConfig;
  remainingDays: number;
  onSubmit: (requestData: Omit<VideoRequest, 'id' | 'createdAt'>) => void;
  onOpenCategoryGuide: () => void;
  onCancel?: () => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  categories,
  currentQuarter,
  remainingDays,
  onSubmit,
  onOpenCategoryGuide,
  onCancel,
}) => {
  // Form fields - Direct user inputs
  const [headquarters, setHeadquarters] = useState<string>('');
  const [team, setTeam] = useState<string>('');
  const [requesterName, setRequesterName] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [majorCategory, setMajorCategory] = useState<string>(categories[0]?.name || '');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [subCountInputs, setSubCountInputs] = useState<Record<string, string>>({});
  const [taskName, setTaskName] = useState<string>('');
  const [requiredDays, setRequiredDays] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9 가로형');
  const [targetLength, setTargetLength] = useState<string>('60초~90초');
  const [notes, setNotes] = useState<string>('');

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

  const currentMajorObj = categories.find((c) => c.name === majorCategory);
  const selectedSubObjs =
    currentMajorObj?.subcategories.filter((s) => selectedSubCategories.includes(s.name)) || [];

  useEffect(() => {
    if (currentMajorObj && currentMajorObj.subcategories.length > 0) {
      const firstSub = currentMajorObj.subcategories[0];
      setSelectedSubCategories([firstSub.name]);
      setSubCountInputs({});
      setRequiredDays(Math.round(firstSub.defaultDays));
    } else {
      setSelectedSubCategories([]);
      setSubCountInputs({});
      setRequiredDays(0);
    }
  }, [majorCategory, currentMajorObj]);

  const handleToggleSubcategory = (subName: string) => {
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

    // Keep canonical order defined by the category list
    const nextOrdered = currentMajorObj.subcategories
      .filter((s) => nextRaw.includes(s.name))
      .map((s) => s.name);

    setSelectedSubCategories(nextOrdered);
    setRequiredDays(calcTotalRequiredDays(currentMajorObj, nextOrdered, nextInputs));
  };

  const handleSubCountChange = (subName: string, rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '');
    const nextInputs = { ...subCountInputs, [subName]: digitsOnly };
    setSubCountInputs(nextInputs);
    setRequiredDays(calcTotalRequiredDays(currentMajorObj, selectedSubCategories, nextInputs));
  };

  const willExceedCapacity = remainingDays <= 0 || requiredDays > remainingDays;
  const projectedBalance = remainingDays - requiredDays;
  const overAmount = projectedBalance < 0 ? Math.abs(projectedBalance) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!headquarters.trim()) {
      setErrorMsg('소속 본부를 직접 입력해 주세요.');
      return;
    }
    if (!team.trim()) {
      setErrorMsg('소속 팀을 직접 입력해 주세요.');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMsg('담당자 성함을 입력해 주세요.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('추후 수정을 위한 비밀번호를 입력해 주세요.');
      return;
    }
    if (!majorCategory || selectedSubCategories.length === 0) {
      setErrorMsg('대분류 및 소분류를 1개 이상 선택해 주세요.');
      return;
    }
    if (!taskName.trim()) {
      setErrorMsg('업무명을 입력해 주세요.');
      return;
    }
    if (requiredDays <= 0) {
      setErrorMsg('업무 소요일은 0일보다 커야 합니다.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('희망 완료일을 선택해 주세요.');
      return;
    }

    const formattedSubCategories = selectedSubCategories.map((name) => {
      const qty = getEffectiveSubCount(name, subCountInputs);
      return isQuantifiableSub(name) && qty > 1
        ? `${name}(${qty}${getSubQuantityUnit(name)})`
        : name;
    });

    onSubmit({
      quarter: currentQuarter.id,
      headquarters: headquarters.trim(),
      team: team.trim(),
      requesterName: requesterName.trim(),
      password: password.trim(),
      majorCategory,
      subCategory: formattedSubCategories.join(', ').slice(0, 100),
      taskName: taskName.trim(),
      requiredDays: Math.round(requiredDays),
      dueDate,
      aspectRatio,
      targetLength,
      notes: notes.trim(),
      status: '접수완료',
      isOverCapacity: willExceedCapacity,
      overCapacityAmount: willExceedCapacity ? Math.round(overAmount) : 0,
      remainingDaysSnapshot: Math.round(remainingDays),
    });

    setTaskName('');
    setNotes('');
    setPassword('');
  };

  const inputClass =
    'w-full text-xs rounded-[3px] border border-[#181715]/25 bg-[#FCF9F3] px-3 py-2 text-[#181715] placeholder-[#8A8275] focus:border-[#181715] focus:bg-white focus:outline-none transition-colors';

  return (
    <div className="bg-[#FAF7F0] rounded-[4px] border border-[#181715]/20 shadow-[0_24px_60px_rgba(24,23,21,0.25)] flex flex-col max-h-[82vh] overflow-hidden text-[#181715]">
      {/* Fixed Header Banner */}
      <div className="px-5 py-4 border-b border-[#181715]/15 bg-[#EFE8DA] text-[#181715] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#E94B22] text-white uppercase tracking-wider">
              {currentQuarter.id}
            </span>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              신규 영상 제작 업무 접수
            </h2>
          </div>
          <p className="text-[11px] text-[#5F5A52] mt-1">
            본부, 팀, 업무 내용 및 분류를 작성하면 소요일이 자동 산정되어 분기 제작 가능 일수에서 차감됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCategoryGuide}
            className="text-xs font-semibold text-[#181715] hover:bg-[#181715] hover:text-[#FAF7F0] flex items-center gap-1 border border-[#181715]/20 bg-[#FAF7F0] rounded-[3px] py-1.5 px-2.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">소요일 기준표</span>
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-[3px] text-[#5F5A52] hover:text-[#181715] hover:bg-[#181715]/10 transition-colors cursor-pointer"
              title="창 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-[3px] bg-[#E94B22]/12 border border-[#E94B22] text-[#181715] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E94B22]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Over-capacity warning banner */}
          {willExceedCapacity && (
            <div className="p-4 rounded-[3px] bg-[#E94B22]/12 border border-[#E94B22]/45 border-l-4 border-l-[#E94B22] text-[#181715] space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#E94B22] shrink-0" />
                <span className="text-xs font-extrabold text-[#E94B22]">
                  제작 가능 일수 초과 접수 알림
                </span>
              </div>
              <p className="text-xs text-[#4C4740] leading-relaxed">
                현재 분기 잔여 일수({Math.round(remainingDays)}일)를 초과하여 약{' '}
                <strong className="font-bold underline text-[#E94B22] font-mono">
                  {Math.round(overAmount)}일이 초과
                </strong>
                됩니다. 등록 시 접수 목록에{' '}
                <span className="bg-[#E94B22] text-white px-1.5 py-0.5 rounded-[2px] font-bold text-[10px]">
                  초과 접수
                </span>
                로 표시되며 영상제작팀의 일정 조율 회의를 거치게 됩니다.
              </p>
            </div>
          )}

          {/* 1. Requesting Department & Requester Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#181715] tracking-tight">
                <span className="font-mono text-[11px] font-bold text-[#E94B22]">01 /</span>
                <User className="w-3.5 h-3.5 text-[#5F5A52]" />
                <span>의뢰 부서 및 신청자 정보</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  소속 본부 <span className="text-[#E94B22]">*</span>
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
                  소속 팀 <span className="text-[#E94B22]">*</span>
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
                  담당자 성함 <span className="text-[#E94B22]">*</span>
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

              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1 flex items-center justify-between">
                  <span>
                    수정 비밀번호 <span className="text-[#E94B22]">*</span>
                  </span>
                  <Lock className="w-3 h-3 text-[#5F5A52]" />
                </label>
                <input
                  type="password"
                  placeholder="비밀번호 4자리 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
                <span className="text-[10px] text-[#5F5A52] block mt-1">
                  추후 수정 시 본인 확인용
                </span>
              </div>
            </div>
          </div>

          {/* 2. Video Classification & Automatic Days Calculation */}
          <div className="space-y-3 pt-4 border-t border-[#181715]/15">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#181715] tracking-tight">
                <span className="font-mono text-[11px] font-bold text-[#E94B22]">02 /</span>
                <Layers className="w-3.5 h-3.5 text-[#5F5A52]" />
                <span>영상 제작 분류 및 업무 소요일 자동 산정</span>
              </div>
              <span className="font-mono text-[10px] text-[#5F5A52] uppercase">
                AUTO-CALCULATED
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  영상 대분류 <span className="text-[#E94B22]">*</span>
                </label>
                <select
                  value={majorCategory}
                  onChange={(e) => setMajorCategory(e.target.value)}
                  className={`${inputClass} font-semibold cursor-pointer`}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {currentMajorObj?.description && (
                  <p className="text-[11px] text-[#5F5A52] mt-1.5">{currentMajorObj.description}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-[#5F5A52]">
                    영상 소분류 (같은 대분류 내 복수 선택 가능){' '}
                    <span className="text-[#E94B22]">*</span>
                  </label>
                  <span className="font-mono text-[11px] font-bold text-[#181715]">
                    {selectedSubObjs.length}개 선택됨
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentMajorObj?.subcategories.map((sub) => {
                    const isChecked = selectedSubCategories.includes(sub.name);
                    const isQuantifiable = isQuantifiableSub(sub.name);
                    const subQty = isChecked ? getEffectiveSubCount(sub.name, subCountInputs) : 1;
                    const subTotalDays = Math.round((Number(sub.defaultDays) || 0) * subQty);

                    return (
                      <div
                        key={sub.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleSubcategory(sub.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSubcategory(sub.name);
                          }
                        }}
                        aria-pressed={isChecked}
                        className={`text-left p-2.5 rounded-[3px] border transition-colors cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-[#EFE8DA] border-[#181715] text-[#181715]'
                            : 'bg-[#FCF9F3] border-[#181715]/20 text-[#181715] hover:bg-[#EFE8DA]/55'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#181715] border-[#181715] text-[#EAE2D3]'
                              : 'bg-white border-[#181715]/30'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold leading-snug truncate">
                              {sub.name}
                            </span>
                            <span className="font-mono text-[11px] font-extrabold text-[#E94B22] shrink-0 tabular-nums">
                              +{subTotalDays}일
                            </span>
                          </div>
                          {sub.description && (
                            <p className="text-[10px] text-[#5F5A52] mt-0.5 line-clamp-2 leading-relaxed">
                              {sub.description}
                            </p>
                          )}
                          {isChecked && isQuantifiable && (
                            <div
                              className="mt-2 pt-2 border-t border-[#181715]/12 flex items-center justify-between gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[11px] font-semibold text-[#5F5A52]">
                                {getSubQuantityLabel(sub.name)}
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  step={1}
                                  placeholder="1"
                                  value={subCountInputs[sub.name] || ''}
                                  onChange={(e) => handleSubCountChange(sub.name, e.target.value)}
                                  className="w-14 text-center font-mono text-xs font-bold rounded-[2px] border border-[#181715]/30 bg-white px-1.5 py-0.5 text-[#181715] focus:border-[#181715] focus:outline-none"
                                />
                                <span className="text-[11px] font-semibold text-[#181715]">
                                  {getSubQuantityUnit(sub.name)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Auto-Calculation Risograph Indicator Card */}
            <div className="bg-[#EFE8DA]/70 rounded-[3px] border border-[#181715]/20 p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-[#181715] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5A92BF] shrink-0" />
                    <span>산정된 업무 소요일</span>
                    <span className="text-[11px] font-normal text-[#5F5A52]">
                      (선택 항목 합산 자동 계산)
                    </span>
                  </div>
                  <div className="text-xs text-[#5F5A52] mt-1">
                    {selectedSubObjs.length > 0 ? (
                      <span>
                        선택 항목:{' '}
                        <strong className="text-[#181715]">
                          {selectedSubObjs
                            .map((s) => {
                              const qty = getEffectiveSubCount(s.name, subCountInputs);
                              const days = Math.round((Number(s.defaultDays) || 0) * qty);
                              return isQuantifiableSub(s.name) && qty > 1 && s.name !== '촬영'
                                ? `${s.name} ${qty}${getSubQuantityUnit(s.name)}(${days}일)`
                                : `${s.name}(${days}일)`;
                            })
                            .join(' + ')}
                        </strong>
                      </span>
                    ) : (
                      <span className="text-[#E94B22] font-semibold">
                        소분류를 1개 이상 선택해 주세요.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 px-3.5 py-1.5 rounded-[3px] bg-[#181715] text-[#EAE2D3] self-start sm:self-auto shrink-0">
                  <span className="text-2xl font-extrabold font-mono tabular-nums">
                    {Math.round(requiredDays)}
                  </span>
                  <span className="text-xs font-semibold">일 소요</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Task Name & Work Details */}
          <div className="space-y-3 pt-4 border-t border-[#181715]/15">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#181715] tracking-tight">
              <span className="font-mono text-[11px] font-bold text-[#E94B22]">03 /</span>
              <FileText className="w-3.5 h-3.5 text-[#5F5A52]" />
              <span>업무명 및 제작 세부사항</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  업무명 (영상 프로젝트 명) <span className="text-[#E94B22]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 2027 희망캠페인 메인 영상 제작 및 후원 숏폼 2편"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className={`${inputClass} font-semibold`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  희망 완료일 <span className="text-[#E94B22]">*</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  희망 화면 비율 / 규격
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="16:9 가로형">16:9 가로형</option>
                  <option value="9:16 세로형">9:16 세로형</option>
                  <option value="1:1 정방형">1:1 정방형</option>
                  <option value="다중 포맷">다중 포맷</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                  예상 영상 분량
                </label>
                <select
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="15초~30초">15초~30초</option>
                  <option value="30초~60초">30초~60초</option>
                  <option value="60초~90초">60초~90초</option>
                  <option value="2분~3분">2분~3분</option>
                  <option value="5분 이상">5분 이상</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5F5A52] mb-1">
                상세 요청사항 및 참고 레퍼런스 링크 (선택)
              </label>
              <textarea
                rows={3}
                placeholder="영상 목적, 주요 타깃, 필수 포함 메시지 및 참고 영상 URL 등을 자유롭게 적어주세요."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* 4. REAL-TIME CAPACITY IMPACT */}
          <div className="pt-4 border-t border-[#181715]/15 space-y-3">
            <div className="text-xs font-extrabold text-[#181715] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#E94B22]">04 /</span>
                <span>분기 가용 일수 실시간 차감 시뮬레이션</span>
              </span>
              <span className="font-mono text-[11px] text-[#5F5A52] tabular-nums">
                현재 잔여: {Math.round(remainingDays)}일
              </span>
            </div>

            <div className="grid grid-cols-3 p-3 bg-[#EAE2D3]/75 rounded-[3px] border border-[#181715]/15 text-center">
              <div>
                <span className="text-[11px] text-[#5F5A52] block">현재 잔여 일수</span>
                <span className="font-mono text-sm font-bold text-[#181715] tabular-nums">
                  {Math.round(remainingDays)}일
                </span>
              </div>
              <div className="border-x border-[#181715]/15">
                <span className="text-[11px] text-[#5F5A52] block">이번 신청 소요일</span>
                <span className="font-mono text-sm font-bold text-[#181715] tabular-nums">
                  -{Math.round(requiredDays)}일
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#5F5A52] block">신청 후 예상 잔여</span>
                <span
                  className={`font-mono text-sm font-extrabold tabular-nums ${
                    projectedBalance < 0 ? 'text-[#E94B22]' : 'text-[#4F8A6B]'
                  }`}
                >
                  {Math.round(projectedBalance)}일
                </span>
              </div>
            </div>

            {!willExceedCapacity && (
              <div className="p-3 rounded-[3px] bg-[#4F8A6B]/12 border border-[#4F8A6B]/35 text-[#181715] flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-[#4F8A6B] shrink-0" />
                <span>
                  가용 일수 범위 내 정상 신청입니다. 접수 즉시 총 가능 일수에서{' '}
                  <strong className="font-mono">{Math.round(requiredDays)}일</strong>이 차감됩니다.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-[#EFE8DA] border-t border-[#181715]/15 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-[#5F5A52] hover:text-[#181715] hover:bg-[#181715]/8 rounded-[3px] transition-colors cursor-pointer"
            >
              취소
            </button>
          )}

          <button
            type="submit"
            className={`px-5 py-2.5 rounded-[3px] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              willExceedCapacity
                ? 'bg-[#E94B22] hover:bg-[#c73c17] text-white'
                : 'bg-[#181715] hover:bg-[#E94B22] text-[#EAE2D3] hover:text-white'
            }`}
          >
            {willExceedCapacity ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>
                  초과 접수로 등록하기 (소요일: {Math.round(requiredDays)}일, 한도 초과)
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>영상 제작 신청 등록 ({Math.round(requiredDays)}일 차감)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
