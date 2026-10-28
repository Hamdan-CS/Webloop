import { Link } from 'react-router-dom';
import { HowItWorksStage } from '@/components/how-it-works/HowItWorksStage';

interface Step {
  title: string;
  desc: string;
}

interface StorySet {
  mode: 'student' | 'company' | 'university';
  h1: string;
  intro: string;
  steps: Step[];
  cta: { primary: { label: string; to: string }; secondary: { label: string; to: string } };
}

const sets: StorySet[] = [
  {
    mode: 'student',
    h1: 'From your first task to your first job',
    intro: 'Scroll to follow one student from an empty profile to getting hired.',
    steps: [
      { title: 'Start with an empty grid', desc: "Create your profile. Each square stands for one day of your year. They're all empty right now, and that's fine." },
      { title: 'Pick a project, take a task', desc: 'Browse student ideas, company projects and university capstones. Once you’re accepted, pick a task with clear acceptance criteria. Your square rises while you work on it.' },
      { title: 'Get it reviewed', desc: 'Submit your work and the project owner checks it against the criteria. When they accept it, the square locks in as a verified contribution that nobody can fake.' },
      { title: 'Keep shipping', desc: 'Every accepted task adds to your grid. Over a year it grows into a skyline of real work, with the project, the stack and the reviewer behind every bar.' },
      { title: 'Your grid writes your CV', desc: 'Each verified task becomes a line on your CV: the project, the company or team behind it, the task you delivered and the rating your reviewer gave you.' },
      { title: 'Get hired from your record', desc: 'Companies read your CV and see exactly who reviewed you and how you were rated. When it fits, they send you an offer straight through WebLoop.' },
    ],
    cta: { primary: { label: 'Create your profile', to: '/join' }, secondary: { label: 'Explore projects', to: '/explore' } },
  },
  {
    mode: 'company',
    h1: 'From posting a project to hiring proven talent',
    intro: 'Scroll to follow one company from its first project to its first hire.',
    steps: [
      { title: 'Post a real project', desc: 'Share a project your team actually needs: the goal, the roles and the tasks, each with clear acceptance criteria.' },
      { title: 'Students apply', desc: 'Students apply for your roles. Every applicant comes with a grid of verified work, so you see what they’ve shipped before you say yes.' },
      { title: 'Watch the work move', desc: 'Accepted students pick up tasks. You see each one move from to do, to review, to done, without managing anyone day to day.' },
      { title: 'Review and rate', desc: 'Check each submission against its criteria and give it a rating. Your review becomes part of the student’s record, so your feedback carries real weight.' },
      { title: 'Spot the best fit', desc: 'Compare applicants by what they delivered, not by what they wrote on a CV. The strongest track record stands out right away.' },
      { title: 'Hire with confidence', desc: 'Send an offer to the student who already proved they can do the job, on your own project.' },
    ],
    cta: { primary: { label: 'Post a project', to: '/publish' }, secondary: { label: 'See verified talent', to: '/gallery' } },
  },
  {
    mode: 'university',
    h1: 'From course project to career outcomes',
    intro: 'Scroll to follow one university course from a capstone brief to a cohort report.',
    steps: [
      { title: 'Publish a capstone', desc: 'Turn a course or thesis project into a WebLoop project with clear tasks and acceptance criteria. Students join it on the same platform they already use.' },
      { title: 'Form student teams', desc: 'Students join and get grouped into teams. Every team has its own board, so you can follow each one without chasing updates by email.' },
      { title: 'Follow progress live', desc: 'Each verified task stacks onto the team’s tower. You see who’s moving and who’s stuck, week by week.' },
      { title: 'Grade with evidence', desc: 'Grades are backed by reviewed work: tasks completed, ratings and acceptance history for every student. No more guessing who did what in a group project.' },
      { title: 'Open doors to industry', desc: 'Partner companies can see your students’ verified records and reach out to them for internships and jobs.' },
      { title: 'Show the outcomes', desc: 'Get a cohort report with verified work, ratings and offers, useful for accreditation, partner meetings and showing what your course delivers.' },
    ],
    cta: { primary: { label: 'Partner with WebLoop', to: '/join' }, secondary: { label: 'Publish a capstone', to: '/publish' } },
  },
];

export function HowItWorksPage() {
  return (
    <>
      <HowItWorksStage />
      <main className="how-page">
        {sets.map((set) => (
          <div key={set.mode} className="how-set" data-mode={set.mode} hidden={set.mode !== 'student'}>
            <header className="how-intro">
              <h1>{set.h1}</h1>
              <p>{set.intro}</p>
            </header>
            {set.steps.map((step, i) => {
              const last = i === set.steps.length - 1;
              return (
                <section key={step.title} className="how-step">
                  <div className="how-n">{i + 1}</div>
                  <h2>{step.title}</h2>
                  <p>{step.desc}</p>
                  {last && (
                    <div className="how-ctas">
                      <Link to={set.cta.primary.to} className="btn-primary">
                        {set.cta.primary.label}
                      </Link>
                      <Link to={set.cta.secondary.to} className="btn-secondary">
                        {set.cta.secondary.label}
                      </Link>
                    </div>
                  )}
                </section>
              );
            })}
            <div className="how-outro" />
          </div>
        ))}
      </main>
    </>
  );
}
