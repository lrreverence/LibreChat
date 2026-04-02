import type { TSkill } from 'librechat-data-provider';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import SkillDetailHeader from './SkillDetailHeader';
import { useLocalize } from '~/hooks';

interface SkillDetailProps {
  skill: TSkill;
}

const SkillDetail = ({ skill }: SkillDetailProps) => {
  const localize = useLocalize();

  return (
    <article
      className="flex min-w-0 flex-col gap-3 overflow-y-auto p-1 sm:gap-4 sm:p-2"
      aria-label={skill.name}
    >
      <h1 className="sr-only">{skill.name}</h1>
      <SkillDetailHeader skill={skill} />
      <section aria-label={localize('com_ui_skill_content')}>
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownLite content={skill.content} codeExecution={false} />
        </div>
      </section>
    </article>
  );
};

export default SkillDetail;
