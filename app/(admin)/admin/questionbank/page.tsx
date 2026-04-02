"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  Download,
  BookOpen,
  Tag,
  Eye,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  Upload,
  Check,
  XCircle,
  FileText,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { questionsApi, modulesApi, questionnairesApi } from "@/app/lib/api";
import { Question, QuestionType, QuestionSource, QuestionFormData, QuestionOption } from "@/app/types/question";
import { Module } from "@/app/types/module";
import Pagination from "@/app/components/Pagination";
import { IconTab, IconTabs } from "@/app/components/IconTabs";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";

type ModalMode = "create" | "edit" | "view" | null;
type TabType = "module" | "general" | "questionnaire";
type QuestionnaireModalMode = "generate" | "preview" | null;

const questionTypeOptions: { value: QuestionType; label: string }[] = [
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer", label: "Long Answer" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "true_false", label: "True/False" },
];

const difficultyOptions: { value: "easy" | "medium" | "hard"; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

interface Questionnaire {
  id: string;
  title: string;
  module_id?: string | null;
  module?: { id: string; name: string };
  batch: string;
  description?: string | null;
  question_counts: Record<string, number>;
  selected_categories: string[];
  total_questions: number;
  source: "module" | "general";
  created_at?: string;
  updated_at?: string;
  questions?: Question[];
}

export default function QuestionBankPage() {
  const [activeTab, setActiveTab] = useState<TabType>("module");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [questionnaireModalMode, setQuestionnaireModalMode] = useState<QuestionnaireModalMode>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleteQuestionnaireTarget, setDeleteQuestionnaireTarget] = useState<Questionnaire | null>(null);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [questionnairePage, setQuestionnairePage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
    has_more_pages: false,
  });
  const [questionnairePagination, setQuestionnairePagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
    has_more_pages: false,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  const [formData, setFormData] = useState<QuestionFormData>({
    question_text: "",
    question_type: "single_select",
    source: "module",
    module_id: null,
    category: "",
    options: [],
    correct_answer: null,
    image_file: null,
    image_url: null,
    difficulty: null,
    points: null,
  });

  const [questionnaireFormData, setQuestionnaireFormData] = useState({
    title: "",
    source: "module" as "module" | "general",
    module_id: "",
    batch: "",
    description: "",
    selected_categories: [] as string[],
    question_counts: {
      short_answer: 0,
      long_answer: 0,
      single_select: 0,
      multi_select: 0,
      true_false: 0,
    },
  });

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questions;
    const searchLower = search.toLowerCase();
    return questions.filter(
      (q) =>
        q.question_text.toLowerCase().includes(searchLower) ||
        q.category.toLowerCase().includes(searchLower)
    );
  }, [questions, search]);

  const loadData = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      if (activeTab === "questionnaire") {
        const questionnairesRes = await questionnairesApi.getAll({
          page,
          source: filterModule ? undefined : "module",
          module_id: filterModule || undefined,
        });

        if (questionnairesRes.pagination) {
          setQuestionnairePagination(questionnairesRes.pagination);
          setQuestionnairePage(questionnairesRes.pagination.current_page);
        }

        const mappedQuestionnaires: Questionnaire[] = (questionnairesRes.questionnaires || []).map((q: any) => ({
          id: q.id.toString(),
          title: q.title,
          module_id: q.module_id?.toString() || null,
          module: q.module
            ? {
                id: q.module.id.toString(),
                name: q.module.name,
              }
            : undefined,
          batch: q.batch,
          description: q.description || null,
          question_counts: q.question_counts || {},
          selected_categories: q.selected_categories || [],
          total_questions: q.total_questions || 0,
          source: q.source || "module",
          created_at: q.created_at,
          updated_at: q.updated_at,
        }));

        // Extract unique batches
        const batches = Array.from(new Set(mappedQuestionnaires.map((q) => q.batch))).sort();
        setAvailableBatches(batches);

        setQuestionnaires(mappedQuestionnaires);
        setLoading(false);
        return;
      }

      const source: QuestionSource = activeTab === "module" ? "module" : "general";
      const [questionsRes, modulesRes] = await Promise.all([
        questionsApi.getAll({
          page,
          source,
          module_id: filterModule || undefined,
          category: filterCategory || undefined,
          question_type: filterType || undefined,
          search: search || undefined,
        }),
        activeTab === "module" ? modulesApi.getAll(1) : Promise.resolve({ modules: [] }),
      ]);

      if (questionsRes.pagination) {
        setPagination(questionsRes.pagination);
        setCurrentPage(questionsRes.pagination.current_page);
      }

      const mappedQuestions: Question[] = (questionsRes.questions || []).map((q: any) => ({
        id: q.id.toString(),
        question_text: q.question_text,
        question_type: q.question_type,
        source: q.source || (q.module_id ? "module" : "general"),
        module_id: q.module_id?.toString() || null,
        module: q.module
          ? {
              id: q.module.id.toString(),
              name: q.module.name,
            }
          : undefined,
        category: q.category || "",
        options: (q.options || []).map((opt: any, idx: number) => ({
          id: opt.id?.toString(),
          text: opt.text || opt.option_text || "",
          is_correct: opt.is_correct || false,
          image_url: opt.image_url || null,
          order: opt.order || idx,
        })),
        correct_answer: q.correct_answer || null,
        image_url: q.image_url || null,
        difficulty: q.difficulty || null,
        points: q.points || null,
        created_at: q.created_at,
        updated_at: q.updated_at,
      }));

      const mappedModules: Module[] = (modulesRes.modules || []).map((m: any) => ({
        id: m.id.toString(),
        name: m.name,
        category: m.category,
        subModulesCount: m.sub_modules_count ?? m.subModulesCount ?? 0,
        amount: Number(m.amount ?? 0),
        staffs: [],
      }));

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(mappedQuestions.map((q) => q.category).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      setQuestions(mappedQuestions);
      setModules(mappedModules);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, filterModule, filterCategory, filterType, search]);

  // Load categories for questionnaire form
  const loadCategoriesForQuestionnaire = useCallback(async () => {
    try {
      const source: QuestionSource = questionnaireFormData.source === "module" ? "module" : "general";
      const categoriesRes = await questionsApi.getCategories({
        module_id: questionnaireFormData.module_id || undefined,
        source,
      });
      setCategories(categoriesRes.categories || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, [questionnaireFormData.source, questionnaireFormData.module_id]);

  useEffect(() => {
    if (questionnaireModalMode === "generate") {
      loadCategoriesForQuestionnaire();
    }
  }, [questionnaireModalMode, questionnaireFormData.source, questionnaireFormData.module_id]);

  useEffect(() => {
    loadData(1);
  }, [activeTab, filterModule, filterCategory, filterType]);

  const loadQuestionnaireData = useCallback(async (page: number = questionnairePage) => {
    try {
      setLoading(true);
      const questionnairesRes = await questionnairesApi.getAll({
        page,
        source: filterModule ? undefined : "module",
        module_id: filterModule || undefined,
      });

      if (questionnairesRes.pagination) {
        setQuestionnairePagination(questionnairesRes.pagination);
        setQuestionnairePage(questionnairesRes.pagination.current_page);
      }

      const mappedQuestionnaires: Questionnaire[] = (questionnairesRes.questionnaires || []).map((q: any) => ({
        id: q.id.toString(),
        title: q.title,
        module_id: q.module_id?.toString() || null,
        module: q.module
          ? {
              id: q.module.id.toString(),
              name: q.module.name,
            }
          : undefined,
        batch: q.batch,
        description: q.description || null,
        question_counts: q.question_counts || {},
        selected_categories: q.selected_categories || [],
        total_questions: q.total_questions || 0,
        source: q.source || "module",
        created_at: q.created_at,
        updated_at: q.updated_at,
      }));

      setQuestionnaires(mappedQuestionnaires);
    } catch (error) {
      console.error("Failed to load questionnaires:", error);
    } finally {
      setLoading(false);
    }
  }, [questionnairePage, filterModule]);

  const openCreate = () => {
    setSelectedQuestion(null);
    setFormData({
      question_text: "",
      question_type: "single_select",
      source: activeTab === "module" ? "module" : "general",
      module_id: activeTab === "module" && modules.length > 0 ? modules[0].id : null,
      category: "",
      options: activeTab === "module"
        ? [
            { text: "", is_correct: false, order: 0 },
            { text: "", is_correct: false, order: 1 },
          ]
        : [],
      correct_answer: null,
      image_file: null,
      image_url: null,
      difficulty: null,
      points: null,
    });
    setNewCategory("");
    setModalMode("create");
  };

  const openEdit = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      source: question.source,
      module_id: question.module_id || null,
      category: question.category,
      options: question.options || [],
      correct_answer: question.correct_answer || null,
      image_file: null,
      image_url: question.image_url || null,
      difficulty: question.difficulty || null,
      points: question.points || null,
    });
    setNewCategory("");
    setModalMode("edit");
  };

  const openView = (question: Question) => {
    setSelectedQuestion(question);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedQuestion(null);
    setNewCategory("");
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        {
          text: "",
          is_correct: false,
          order: formData.options.length,
        },
      ],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index).map((opt, idx) => ({
      ...opt,
      order: idx,
    }));
    setFormData({ ...formData, options: newOptions });
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "question" | "option", optionIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "question") {
      setFormData({ ...formData, image_file: file });
    } else if (type === "option" && optionIndex !== undefined) {
      const newOptions = [...formData.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], image_file: file };
      setFormData({ ...formData, options: newOptions });
    }
  };

  const removeImage = (type: "question" | "option", optionIndex?: number) => {
    if (type === "question") {
      setFormData({ ...formData, image_file: null, image_url: null });
    } else if (type === "option" && optionIndex !== undefined) {
      const newOptions = [...formData.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], image_file: null, image_url: null };
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === "__new__") {
      setFormData({ ...formData, category: "" });
      setNewCategory("");
    } else {
      setFormData({ ...formData, category: value });
      setNewCategory("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.question_text.trim()) {
      alert("Please enter a question");
      return;
    }

    if (!formData.category.trim() && !newCategory.trim()) {
      alert("Please enter or select a category");
      return;
    }

    if (formData.source === "module" && !formData.module_id) {
      alert("Please select a module");
      return;
    }

    const finalCategory = newCategory.trim() || formData.category;

    // Validate based on question type
    if (formData.question_type === "single_select" || formData.question_type === "multi_select" || formData.question_type === "true_false") {
      if (formData.options.length < 2) {
        alert("Please add at least 2 options");
        return;
      }

      const hasCorrect = formData.options.some((opt) => opt.is_correct);
      if (!hasCorrect) {
        alert("Please mark at least one option as correct");
        return;
      }

      if (formData.question_type === "single_select") {
        const correctCount = formData.options.filter((opt) => opt.is_correct).length;
        if (correctCount !== 1) {
          alert("Single select questions must have exactly one correct answer");
          return;
        }
      }
    } else if (formData.question_type === "short_answer" || formData.question_type === "long_answer") {
      if (!formData.correct_answer?.trim()) {
        alert("Please provide a correct answer");
        return;
      }
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("question_text", formData.question_text);
      formDataToSend.append("question_type", formData.question_type);
      formDataToSend.append("source", formData.source);
      if (formData.module_id) {
        formDataToSend.append("module_id", formData.module_id);
      }
      formDataToSend.append("category", finalCategory);
      formDataToSend.append("difficulty", formData.difficulty || "");
      if (formData.points) {
        formDataToSend.append("points", formData.points.toString());
      }

      if (formData.image_file) {
        formDataToSend.append("question_image", formData.image_file);
      }

      if (formData.question_type === "short_answer" || formData.question_type === "long_answer") {
        formDataToSend.append("correct_answer", formData.correct_answer || "");
      } else {
        formData.options.forEach((option, index) => {
          formDataToSend.append(`options[${index}][text]`, option.text);
          formDataToSend.append(`options[${index}][is_correct]`, option.is_correct ? "1" : "0");
          formDataToSend.append(`options[${index}][order]`, option.order.toString());
          if (option.image_file) {
            formDataToSend.append(`options[${index}][image]`, option.image_file);
          }
        });
      }

      if (modalMode === "edit" && selectedQuestion) {
        await questionsApi.update(selectedQuestion.id, formDataToSend);
      } else {
        await questionsApi.create(formDataToSend);
      }

      await loadData();
      closeModal();
    } catch (error: any) {
      alert(error.message || "Failed to save question");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await questionsApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete question");
    }
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    return questionTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  const handleResetFilters = () => {
    setFilterModule("");
    setFilterCategory("");
    setFilterType("");
    setSearch("");
    setCurrentPage(1);
  };

  const openGenerateQuestionnaire = () => {
    setQuestionnaireFormData({
      title: "",
      source: "module",
      module_id: modules.length > 0 ? modules[0].id : "",
      batch: "",
      description: "",
      selected_categories: [],
      question_counts: {
        short_answer: 0,
        long_answer: 0,
        single_select: 0,
        multi_select: 0,
        true_false: 0,
      },
    });
    setQuestionnaireModalMode("generate");
  };

  const closeQuestionnaireModal = () => {
    setQuestionnaireModalMode(null);
    setSelectedQuestionnaire(null);
  };

  const handleGenerateQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionnaireFormData.title.trim()) {
      alert("Please enter a title for the questionnaire");
      return;
    }

    if (!questionnaireFormData.batch.trim()) {
      alert("Please enter a batch");
      return;
    }

    if (questionnaireFormData.source === "module" && !questionnaireFormData.module_id) {
      alert("Please select a module");
      return;
    }

    if (questionnaireFormData.selected_categories.length === 0) {
      alert("Please select at least one category");
      return;
    }

    const totalQuestions = Object.values(questionnaireFormData.question_counts).reduce(
      (sum, count) => sum + count,
      0
    );

    if (totalQuestions === 0) {
      alert("Please specify at least one question for any question type");
      return;
    }

    try {
      await questionnairesApi.create({
        title: questionnaireFormData.title,
        source: questionnaireFormData.source,
        module_id: questionnaireFormData.source === "module" ? questionnaireFormData.module_id : null,
        batch: questionnaireFormData.batch,
        description: questionnaireFormData.description || undefined,
        selected_categories: questionnaireFormData.selected_categories,
        question_counts: questionnaireFormData.question_counts,
      });

      await loadQuestionnaireData();
      closeQuestionnaireModal();
    } catch (error: any) {
      alert(error.message || "Failed to generate questionnaire");
    }
  };

  const handleDownloadQuestionnaire = async (questionnaire: any) => {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Create a printable container
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.top = '0';
      printContainer.style.left = '0';
      printContainer.style.width = '210mm'; // A4 width
      printContainer.style.minHeight = '297mm'; // A4 height
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.padding = '20mm';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.boxSizing = 'border-box';

      // Build HTML content
      const questionsHtml = questionnaire.questions
        .map((q: any, index: number) => {
          let questionHtml = `
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333;">
                ${index + 1}. ${q.question_text}
              </div>
          `;

          if (q.image_url) {
            questionHtml += `
              <div style="margin: 10px 0;">
                <img src="${q.image_url}" alt="Question" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
              </div>
            `;
          }

          if (q.options && q.options.length > 0) {
            questionHtml += '<div style="margin-left: 20px; margin-top: 8px;">';
            q.options.forEach((opt: any, optIdx: number) => {
              const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...
              questionHtml += `
                <div style="margin-bottom: 6px; display: flex; align-items: start;">
                  <span style="font-weight: bold; margin-right: 8px; min-width: 20px;">${optionLabel}.</span>
                  <span style="flex: 1;">${opt.text}</span>
                </div>
              `;
              if (opt.image_url) {
                questionHtml += `
                  <div style="margin-left: 28px; margin-bottom: 8px;">
                    <img src="${opt.image_url}" alt="Option" style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
                  </div>
                `;
              }
            });
            questionHtml += '</div>';
          }

          if (q.correct_answer) {
            questionHtml += `
              <div style="margin-top: 8px; padding: 8px; background-color: #f0f0f0; border-left: 3px solid #432AD5; font-size: 12px;">
                <strong>Answer:</strong> ${q.correct_answer}
              </div>
            `;
          }

          questionHtml += '</div>';
          return questionHtml;
        })
        .join('');

      printContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #432AD5; padding-bottom: 15px;">
          <h1 style="color: #432AD5; font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">
            ${questionnaire.title}
          </h1>
          ${questionnaire.module ? `<p style="color: #666; font-size: 16px; margin: 5px 0;">Module: ${questionnaire.module.name}</p>` : ''}
          <p style="color: #666; font-size: 14px; margin: 5px 0;">Batch: ${questionnaire.batch}</p>
          ${questionnaire.description ? `<p style="color: #666; font-size: 12px; margin: 5px 0;">${questionnaire.description}</p>` : ''}
        </div>
        <div style="margin-bottom: 15px; font-size: 12px; color: #666;">
          <p><strong>Total Questions:</strong> ${questionnaire.total_questions}</p>
          <p><strong>Categories:</strong> ${questionnaire.selected_categories.join(', ')}</p>
        </div>
        <div style="margin-top: 20px;">
          ${questionsHtml}
        </div>
      `;

      // Append to body temporarily
      document.body.appendChild(printContainer);

      // Convert to canvas
      const canvas = await html2canvas(printContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: false,
        allowTaint: true,
        foreignObjectRendering: false,
        windowWidth: 794, // A4 width in pixels at 96 DPI
        windowHeight: printContainer.scrollHeight,
        onclone: (clonedDoc: Document) => {
          // Remove all external stylesheets
          if (clonedDoc.head) {
            const allStyles = clonedDoc.head.querySelectorAll('style, link[rel="stylesheet"]');
            allStyles.forEach((style: Element) => {
              try {
                if (style.parentNode) {
                  style.parentNode.removeChild(style);
                }
              } catch (e) {
                // Ignore errors
              }
            });
          }
          // Remove classes from elements
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            if (el instanceof SVGElement) {
              return;
            }
            const htmlEl = el as HTMLElement;
            if (htmlEl.classList && typeof htmlEl.className === 'string') {
              htmlEl.className = '';
            }
          });
        },
      } as any);

      // Remove temporary container
      document.body.removeChild(printContainer);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate image');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Questionnaire_${questionnaire.title.replace(/\s+/g, '_')}_${questionnaire.batch}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message || 'Failed to download questionnaire');
    }
  };

  const confirmDeleteQuestionnaire = async () => {
    if (!deleteQuestionnaireTarget) return;
    try {
      await questionnairesApi.delete(deleteQuestionnaireTarget.id);
      await loadQuestionnaireData();
      setDeleteQuestionnaireTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete questionnaire");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-base-content">Question Bank</h1>
          <p className="text-base-content/70 mt-2">
            Manage examination questions and question banks
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          {activeTab !== "questionnaire" && (
            <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline whitespace-nowrap">Add Question</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
          {activeTab !== "questionnaire" && (
            <button
              className="btn btn-outline btn-primary gap-2 items-center px-6"
              onClick={() => setQuestionnaireModalMode("generate")}
            >
              <FileCheck className="h-5 w-5" />
              <span className="hidden sm:inline whitespace-nowrap">Generate Question Paper</span>
              <span className="sm:hidden">Generate</span>
            </button>
          )}
        </div>
      </div>

      <IconTabs>
        <IconTab
          active={activeTab === "module"}
          icon={BookOpen}
          onClick={() => {
            setActiveTab("module");
            setFilterModule("");
            setFilterCategory("");
            setSearch("");
          }}
        >
          Module questions
        </IconTab>
        <IconTab
          active={activeTab === "general"}
          icon={FileQuestion}
          onClick={() => {
            setActiveTab("general");
            setFilterModule("");
            setFilterCategory("");
            setSearch("");
          }}
        >
          General questions
        </IconTab>
        <IconTab
          active={activeTab === "questionnaire"}
          icon={FileText}
          onClick={() => {
            setActiveTab("questionnaire");
            setFilterModule("");
            setFilterCategory("");
            setSearch("");
            loadQuestionnaireData(1);
          }}
        >
          Questionnaires
        </IconTab>
      </IconTabs>

      {/* Search and Filter */}
      {activeTab !== "questionnaire" && (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="form-control flex-1 min-w-0">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Search questions..."
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="btn btn-square btn-primary flex-shrink-0">
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {activeTab === "module" && (
                <div className="form-control flex-shrink-0 sm:w-48">
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                  >
                    <option value="">All Modules</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-control flex-shrink-0 sm:w-48">
                <select
                  className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control flex-shrink-0 sm:w-48">
                <select
                  className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {questionTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire Filter */}
      {activeTab === "questionnaire" && (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-base-content">Filters</h3>
              <button
                className="btn btn-outline btn-sm gap-2 items-center"
                onClick={() => {
                  setFilterModule("");
                  setCurrentPage(1);
                  loadQuestionnaireData(1);
                }}
                title="Reset all filters"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset Filters</span>
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="form-control flex-shrink-0 sm:w-48">
                <select
                  className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                >
                  <option value="">All Modules</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions List or Questionnaire List */}
      {activeTab !== "questionnaire" ? (
        <div className="card bg-base-100 border border-base-300 shadow-md">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">
                No questions found
              </h3>
              <p className="text-base-content/70 mb-4">
                Create your first question to get started
              </p>
              <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="whitespace-nowrap">Add Question</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200">
                    <th className="text-base-content font-semibold whitespace-nowrap">Question</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Type</th>
                    {activeTab === "module" && (
                      <th className="text-base-content font-semibold whitespace-nowrap">Module</th>
                    )}
                    <th className="text-base-content font-semibold whitespace-nowrap">Category</th>
                    <th className="text-base-content font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((question) => (
                    <tr key={question.id} className="hover">
                      <td>
                        <div className="flex items-start gap-3 min-w-0">
                          {question.image_url && (
                            <div className="flex-shrink-0">
                              <img
                                src={question.image_url}
                                alt="Question"
                                className="w-16 h-16 object-cover rounded-lg border border-base-300"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base-content line-clamp-2">
                              {question.question_text}
                            </div>
                            <div className="text-sm text-base-content/70 mt-1">
                              {question.difficulty && (
                                <span className="badge badge-outline badge-sm mr-2">
                                  {difficultyOptions.find((d) => d.value === question.difficulty)?.label}
                                </span>
                              )}
                              {question.points && (
                                <span className="text-base-content/50">
                                  {question.points} points
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm whitespace-nowrap">
                          {getQuestionTypeLabel(question.question_type)}
                        </span>
                      </td>
                      {activeTab === "module" && (
                        <td>
                          {question.module ? (
                            <span className="badge badge-primary badge-sm whitespace-nowrap">
                              {question.module.name}
                            </span>
                          ) : (
                            <span className="text-base-content/50 text-sm">N/A</span>
                          )}
                        </td>
                      )}
                      <td>
                        <span className="badge badge-outline badge-sm whitespace-nowrap">
                          {question.category}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(question)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                            onClick={() => openEdit(question)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(question)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          {/* Pagination */}
          {!loading && filteredQuestions.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={pagination.last_page}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              loading={loading}
              onPageChange={loadData}
              itemName="questions"
            />
          )}
        </div>
      ) : (
        /* Questionnaire List */
        <div className="card bg-base-100 border border-base-300 shadow-md">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : questionnaires.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                <h3 className="text-xl font-semibold text-base-content mb-2">
                  No questionnaires found
                </h3>
                <p className="text-base-content/70 mb-4">
                  Generate your first question paper to get started
                </p>
                <button
                  className="btn btn-primary gap-2 items-center px-6"
                  onClick={() => setQuestionnaireModalMode("generate")}
                >
                  <FileCheck className="h-4 w-4" />
                  <span className="whitespace-nowrap">Generate Question Paper</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-base-200">
                      <th className="text-base-content font-semibold whitespace-nowrap">Title</th>
                      <th className="text-base-content font-semibold whitespace-nowrap">Module</th>
                      <th className="text-base-content font-semibold whitespace-nowrap">Batch</th>
                      <th className="text-base-content font-semibold whitespace-nowrap">Categories</th>
                      <th className="text-base-content font-semibold whitespace-nowrap">Questions</th>
                      <th className="text-base-content font-semibold whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionnaires.map((questionnaire) => (
                      <tr key={questionnaire.id} className="hover">
                        <td>
                          <div className="font-semibold text-base-content">{questionnaire.title}</div>
                          {questionnaire.description && (
                            <div className="text-sm text-base-content/70 mt-1">
                              {questionnaire.description}
                            </div>
                          )}
                        </td>
                        <td>
                          {questionnaire.module ? (
                            <span className="badge badge-primary badge-sm whitespace-nowrap">
                              {questionnaire.module.name}
                            </span>
                          ) : (
                            <span className="text-base-content/50 text-sm">General</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-outline badge-sm whitespace-nowrap">
                            {questionnaire.batch}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {questionnaire.selected_categories.slice(0, 2).map((cat, idx) => (
                              <span key={idx} className="badge badge-outline badge-xs">
                                {cat}
                              </span>
                            ))}
                            {questionnaire.selected_categories.length > 2 && (
                              <span className="badge badge-ghost badge-xs">
                                +{questionnaire.selected_categories.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-base-content font-semibold">
                            {questionnaire.total_questions} questions
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                              onClick={async () => {
                                try {
                                  const res = await questionnairesApi.getById(questionnaire.id);
                                  setSelectedQuestionnaire(res.questionnaire);
                                  setQuestionnaireModalMode("preview");
                                } catch (error: any) {
                                  alert(error.message || "Failed to load questionnaire");
                                }
                              }}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline whitespace-nowrap">Preview</span>
                            </button>
                            <button
                              className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                              onClick={async () => {
                                try {
                                  const res = await questionnairesApi.getById(questionnaire.id);
                                  await handleDownloadQuestionnaire(res.questionnaire);
                                } catch (error: any) {
                                  alert(error.message || "Failed to download questionnaire");
                                }
                              }}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline whitespace-nowrap">Download</span>
                            </button>
                            <button
                              className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                              onClick={() => setDeleteQuestionnaireTarget(questionnaire)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline whitespace-nowrap">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Pagination */}
          {!loading && questionnaires.length > 0 && (
            <Pagination
              currentPage={questionnairePage}
              lastPage={questionnairePagination.last_page}
              total={questionnairePagination.total}
              from={questionnairePagination.from}
              to={questionnairePagination.to}
              loading={loading}
              onPageChange={loadQuestionnaireData}
              itemName="questionnaires"
            />
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && modalMode !== "view" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-300 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-base-content">
              {modalMode === "edit" ? "Edit Question" : "Create New Question"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Type */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Question Type *</span>
                </label>
                <select
                  className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  value={formData.question_type}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    setFormData({
                      ...formData,
                      question_type: newType,
                      options:
                        newType === "single_select" || newType === "multi_select" || newType === "true_false"
                          ? newType === "true_false"
                            ? [
                                { text: "True", is_correct: false, order: 0 },
                                { text: "False", is_correct: false, order: 1 },
                              ]
                            : [
                                { text: "", is_correct: false, order: 0 },
                                { text: "", is_correct: false, order: 1 },
                              ]
                          : [],
                      correct_answer: newType === "short_answer" || newType === "long_answer" ? "" : null,
                    });
                  }}
                  required
                >
                  {questionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Selection (only for module questions) */}
              {formData.source === "module" && (
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Module *</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={formData.module_id || ""}
                    onChange={(e) => setFormData({ ...formData, module_id: e.target.value || null })}
                    required
                  >
                    <option value="">Select Module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Category *</span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered flex-1 border-base-300 focus:border-primary focus:outline-none"
                    value={newCategory ? "__new__" : formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required={!newCategory}
                  >
                    <option value="">Select or create category</option>
                    {categories
                      .filter((cat) => {
                        if (formData.source === "module" && formData.module_id) {
                          // Filter categories for this module (in real app, this would come from API)
                          return true;
                        }
                        return true;
                      })
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    <option value="__new__">+ Create New Category</option>
                  </select>
                  {(!formData.category || newCategory) && (
                    <input
                      type="text"
                      className="input input-bordered flex-1 border-base-300 focus:border-primary focus:outline-none"
                      placeholder="Enter new category"
                      value={newCategory}
                      onChange={(e) => {
                        setNewCategory(e.target.value);
                        setFormData({ ...formData, category: e.target.value });
                      }}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Question Text *</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full border-base-300 focus:border-primary focus:outline-none min-h-[100px]"
                  placeholder="Enter your question..."
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  required
                />
              </div>

              {/* Question Image */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Question Image (Optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  {formData.image_url && !formData.image_file && (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Question"
                        className="w-32 h-32 object-cover rounded-lg border border-base-300"
                      />
                      <button
                        type="button"
                        className="btn btn-circle btn-sm btn-delete absolute -top-2 -right-2"
                        onClick={() => removeImage("question")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {formData.image_file && (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(formData.image_file)}
                        alt="Question"
                        className="w-32 h-32 object-cover rounded-lg border border-base-300"
                      />
                      <button
                        type="button"
                        className="btn btn-circle btn-sm btn-delete absolute -top-2 -right-2"
                        onClick={() => removeImage("question")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <label className="btn btn-outline btn-sm gap-2 items-center">
                    <Upload className="h-4 w-4" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "question")}
                    />
                  </label>
                </div>
              </div>

              {/* Options for Select Questions */}
              {(formData.question_type === "single_select" ||
                formData.question_type === "multi_select" ||
                formData.question_type === "true_false") && (
                <div className="form-control">
                  <div className="flex items-center justify-between mb-4">
                    <label className="label pb-0">
                      <span className="label-text font-semibold text-base-content">Options *</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm gap-2 items-center"
                      onClick={addOption}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="whitespace-nowrap">Add Option</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.options.map((option, index) => (
                      <div
                        key={index}
                        className="card bg-base-200 border border-base-300 p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="input input-bordered flex-1 border-base-300 focus:border-primary focus:outline-none"
                                placeholder="Option text"
                                value={option.text}
                                onChange={(e) => updateOption(index, "text", e.target.value)}
                                required
                              />
                              <label className="label cursor-pointer gap-2">
                                <span className="label-text text-sm font-medium">Correct</span>
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-primary"
                                  checked={option.is_correct}
                                  onChange={(e) => {
                                    if (formData.question_type === "single_select") {
                                      // For single select, uncheck all others
                                      const newOptions = formData.options.map((opt, idx) => ({
                                        ...opt,
                                        is_correct: idx === index ? e.target.checked : false,
                                      }));
                                      setFormData({ ...formData, options: newOptions });
                                    } else {
                                      updateOption(index, "is_correct", e.target.checked);
                                    }
                                  }}
                                />
                              </label>
                              {formData.options.length > 2 && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm btn-circle"
                                  onClick={() => removeOption(index)}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {option.image_url && !option.image_file && (
                                <div className="relative">
                                  <img
                                    src={option.image_url}
                                    alt="Option"
                                    className="w-24 h-24 object-cover rounded-lg border border-base-300"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-circle btn-xs btn-delete absolute -top-1 -right-1"
                                    onClick={() => removeImage("option", index)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              {option.image_file && (
                                <div className="relative">
                                  <img
                                    src={URL.createObjectURL(option.image_file)}
                                    alt="Option"
                                    className="w-24 h-24 object-cover rounded-lg border border-base-300"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-circle btn-xs btn-delete absolute -top-1 -right-1"
                                    onClick={() => removeImage("option", index)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              <label className="btn btn-outline btn-xs gap-1 items-center">
                                <ImageIcon className="h-3 w-3" />
                                <span>Image</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, "option", index)}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer for Short/Long Answer */}
              {(formData.question_type === "short_answer" ||
                formData.question_type === "long_answer") && (
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Correct Answer *</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full border-base-300 focus:border-primary focus:outline-none min-h-[100px]"
                    placeholder="Enter the correct answer..."
                    value={formData.correct_answer || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, correct_answer: e.target.value })
                    }
                    required
                  />
                </div>
              )}

              {/* Difficulty and Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Difficulty</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={formData.difficulty || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: (e.target.value || null) as "easy" | "medium" | "hard" | null,
                      })
                    }
                  >
                    <option value="">Select Difficulty</option>
                    {difficultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Points</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    placeholder="Points"
                    min={0}
                    value={formData.points || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-action flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 px-6"
                  onClick={closeModal}
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <span className="whitespace-nowrap">
                    {modalMode === "edit" ? "Update Question" : "Create Question"}
                  </span>
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={closeModal}>
            <button>close</button>
          </form>
        </dialog>
      )}

      <RecordDetailModal
        open={modalMode === "view" && !!selectedQuestion}
        title="Question"
        subtitle={selectedQuestion ? getQuestionTypeLabel(selectedQuestion.question_type) : undefined}
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm min-h-9 h-9 px-4" onClick={closeModal}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-h-9 h-9 gap-1.5 px-4"
              onClick={() => {
                if (!selectedQuestion) return;
                closeModal();
                openEdit(selectedQuestion);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              {selectedQuestion.module ? (
                <div>
                  <p className="text-xs text-base-content/60">Module</p>
                  <p className="text-sm font-medium text-base-content">{selectedQuestion.module.name}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-base-content/60">Category</p>
                <p className="text-sm font-medium text-base-content">{selectedQuestion.category}</p>
              </div>
              {selectedQuestion.difficulty ? (
                <div>
                  <p className="text-xs text-base-content/60">Difficulty</p>
                  <p className="text-sm font-medium text-base-content">
                    {difficultyOptions.find((d) => d.value === selectedQuestion.difficulty)?.label}
                  </p>
                </div>
              ) : null}
              {selectedQuestion.points ? (
                <div>
                  <p className="text-xs text-base-content/60">Points</p>
                  <p className="text-sm font-medium text-base-content">{selectedQuestion.points}</p>
                </div>
              ) : null}
            </div>

            <div>
              <RecordDetailSectionTitle>Prompt</RecordDetailSectionTitle>
              <p className="text-sm font-medium text-base-content leading-snug">{selectedQuestion.question_text}</p>
              {selectedQuestion.image_url ? (
                <img
                  src={selectedQuestion.image_url}
                  alt=""
                  className="mt-2 w-full max-h-48 rounded-lg border border-base-300 object-contain bg-base-200/40"
                />
              ) : null}
            </div>

            {selectedQuestion.options && selectedQuestion.options.length > 0 ? (
              <div>
                <RecordDetailSectionTitle>Options</RecordDetailSectionTitle>
                <div className="space-y-1.5">
                  {selectedQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border px-2.5 py-2 text-sm ${
                        option.is_correct
                          ? "border-success/40 bg-success/10"
                          : "border-base-300 bg-base-200/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {option.is_correct ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : null}
                        <span className="font-medium text-base-content leading-snug">{option.text}</span>
                      </div>
                      {option.image_url ? (
                        <img
                          src={option.image_url}
                          alt=""
                          className="mt-2 h-24 w-24 rounded-md border border-base-300 object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedQuestion.correct_answer ? (
              <div>
                <RecordDetailSectionTitle>Correct answer</RecordDetailSectionTitle>
                <p className="rounded-lg border border-success/40 bg-success/10 px-2.5 py-2 text-sm font-medium text-base-content">
                  {selectedQuestion.correct_answer}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete question?"
        description="Removes this question from the bank permanently. Cannot be undone."
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Generate Questionnaire Modal */}
      {questionnaireModalMode === "generate" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-300 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-base-content">Generate Question Paper</h3>
            <form onSubmit={handleGenerateQuestionnaire} className="space-y-6">
              {/* Title */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Title *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  placeholder="e.g., Mid-Term Examination 2026"
                  value={questionnaireFormData.title}
                  onChange={(e) =>
                    setQuestionnaireFormData({ ...questionnaireFormData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* Source */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Source *</span>
                </label>
                <select
                  className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  value={questionnaireFormData.source}
                  onChange={(e) =>
                    setQuestionnaireFormData({
                      ...questionnaireFormData,
                      source: e.target.value as "module" | "general",
                      module_id: e.target.value === "general" ? "" : questionnaireFormData.module_id,
                    })
                  }
                  required
                >
                  <option value="module">Module Questions</option>
                  <option value="general">General Questions</option>
                </select>
              </div>

              {/* Module Selection */}
              {questionnaireFormData.source === "module" && (
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Module *</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={questionnaireFormData.module_id}
                    onChange={(e) =>
                      setQuestionnaireFormData({
                        ...questionnaireFormData,
                        module_id: e.target.value,
                        selected_categories: [], // Reset categories when module changes
                      })
                    }
                    required
                  >
                    <option value="">Select Module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batch */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Batch *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                  placeholder="e.g., 2026"
                  value={questionnaireFormData.batch}
                  onChange={(e) =>
                    setQuestionnaireFormData({ ...questionnaireFormData, batch: e.target.value })
                  }
                  required
                />
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full border-base-300 focus:border-primary focus:outline-none min-h-[80px]"
                  placeholder="Optional description..."
                  value={questionnaireFormData.description}
                  onChange={(e) =>
                    setQuestionnaireFormData({
                      ...questionnaireFormData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              {/* Categories */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Categories *</span>
                </label>
                {categories.length === 0 ? (
                  <div className="alert alert-warning">
                    <span>No categories available. Please create questions with categories first.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <label key={cat} className="label cursor-pointer gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={questionnaireFormData.selected_categories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuestionnaireFormData({
                                ...questionnaireFormData,
                                selected_categories: [...questionnaireFormData.selected_categories, cat],
                              });
                            } else {
                              setQuestionnaireFormData({
                                ...questionnaireFormData,
                                selected_categories: questionnaireFormData.selected_categories.filter(
                                  (c) => c !== cat
                                ),
                              });
                            }
                          }}
                        />
                        <span className="label-text">{cat}</span>
                      </label>
                    ))}
                  </div>
                )}
                {questionnaireFormData.selected_categories.length === 0 && categories.length > 0 && (
                  <label className="label pt-1">
                    <span className="label-text-alt text-error">
                      Please select at least one category
                    </span>
                  </label>
                )}
              </div>

              {/* Question Counts */}
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">
                    Number of Questions by Type *
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionTypeOptions.map((type) => (
                    <div key={type.value} className="form-control">
                      <label className="label pb-2">
                        <span className="label-text text-sm font-medium text-base-content">
                          {type.label}
                        </span>
                      </label>
                      <input
                        type="number"
                        className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                        min={0}
                        value={questionnaireFormData.question_counts[type.value as keyof typeof questionnaireFormData.question_counts] || 0}
                        onChange={(e) =>
                          setQuestionnaireFormData({
                            ...questionnaireFormData,
                            question_counts: {
                              ...questionnaireFormData.question_counts,
                              [type.value]: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <label className="label pt-2">
                  <span className="label-text-alt text-base-content/70">
                    Total:{" "}
                    {Object.values(questionnaireFormData.question_counts).reduce(
                      (sum, count) => sum + count,
                      0
                    )}{" "}
                    questions
                  </span>
                </label>
              </div>

              <div className="modal-action flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 px-6"
                  onClick={closeQuestionnaireModal}
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <span className="whitespace-nowrap">Generate Question Paper</span>
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={closeQuestionnaireModal}>
            <button>close</button>
          </form>
        </dialog>
      )}

      {/* Preview Questionnaire Modal */}
      {questionnaireModalMode === "preview" && selectedQuestionnaire && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-300 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-base-content">Questionnaire Preview</h3>
            <div className="space-y-4">
              <div className="card bg-base-200 border border-base-300 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-base-content/70">Title</p>
                    <p className="font-semibold text-base-content">{selectedQuestionnaire.title}</p>
                  </div>
                  {selectedQuestionnaire.module && (
                    <div>
                      <p className="text-sm text-base-content/70">Module</p>
                      <p className="font-semibold text-base-content">
                        {selectedQuestionnaire.module.name}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-base-content/70">Batch</p>
                    <p className="font-semibold text-base-content">{selectedQuestionnaire.batch}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/70">Total Questions</p>
                    <p className="font-semibold text-base-content">
                      {selectedQuestionnaire.total_questions}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-base-content/70 mb-2">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestionnaire.selected_categories.map((cat, idx) => (
                        <span key={idx} className="badge badge-outline badge-sm">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              <div>
                <h4 className="font-semibold text-base-content mb-3">Questions</h4>
                <div className="space-y-4">
                  {selectedQuestionnaire.questions?.map((q: any, index: number) => (
                    <div
                      key={q.id}
                      className="card bg-base-200 border border-base-300 p-4"
                    >
                      <div className="font-semibold text-base-content mb-2">
                        {index + 1}. {q.question_text}
                      </div>
                      {q.image_url && (
                        <img
                          src={q.image_url}
                          alt="Question"
                          className="w-full max-w-md rounded-lg border border-base-300 mt-2"
                        />
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2 p-2 rounded ${
                                opt.is_correct ? "bg-success/10 border border-success" : "bg-base-100"
                              }`}
                            >
                              <span className="font-semibold text-base-content min-w-[20px]">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="text-base-content flex-1">{opt.text}</span>
                              {opt.is_correct && (
                                <Check className="h-4 w-4 text-success flex-shrink-0" />
                              )}
                              {opt.image_url && (
                                <img
                                  src={opt.image_url}
                                  alt="Option"
                                  className="w-24 h-24 object-cover rounded-lg border border-base-300 mt-1"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.correct_answer && (
                        <div className="mt-3 p-2 bg-success/10 border border-success rounded">
                          <span className="text-sm font-semibold text-success">Answer: </span>
                          <span className="text-base-content">{q.correct_answer}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action flex justify-end gap-3 mt-8">
              <button className="btn btn-ghost gap-2 px-6" onClick={closeQuestionnaireModal}>
                <span className="whitespace-nowrap">Close</span>
              </button>
              <button
                className="btn btn-primary gap-2 px-6 items-center"
                onClick={async () => {
                  try {
                    await handleDownloadQuestionnaire(selectedQuestionnaire);
                  } catch (error: any) {
                    alert(error.message || "Failed to download questionnaire");
                  }
                }}
              >
                <Download className="h-4 w-4" />
                <span className="whitespace-nowrap">Download</span>
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={closeQuestionnaireModal}>
            <button>close</button>
          </form>
        </dialog>
      )}

      <ConfirmDialog
        open={!!deleteQuestionnaireTarget}
        title="Delete questionnaire?"
        description={
          <>
            <span className="font-medium text-base-content">{deleteQuestionnaireTarget?.title}</span>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteQuestionnaireTarget(null)}
        onConfirm={confirmDeleteQuestionnaire}
      />
    </div>
  );
}
