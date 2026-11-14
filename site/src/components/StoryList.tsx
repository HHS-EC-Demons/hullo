import { storyOf } from '../data/stories';

export default function StoryList({ id, stack = false }: { id: string; stack?: boolean }) {
  const story = storyOf(id);
  if (!story) return null;
  return (
    <dl className={stack ? 'story stack' : 'story'}>
      {story.lines.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
