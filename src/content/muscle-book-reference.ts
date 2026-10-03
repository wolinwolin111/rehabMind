import reviews from './muscle-book-review.json';

export interface MuscleBookReview {
  printedPages: number[];
  coverage: 'attachments' | 'group' | 'secondary';
  reviewNote: string;
}
export const muscleBookReviews = reviews as Record<string,MuscleBookReview>;
export function muscleBookReference(name:string) {
  const key=name.replace(/\b(left|right)\s+/gi,'').toLowerCase().trim();
  const review=muscleBookReviews[key];
  if(!review)return null;
  const pages=review.printedPages.join('、');
  return {...review,label:review.coverage==='secondary'
    ? '本次书籍比对未找到本条独立起止点；详细附着参考大学解剖资料。'
    : `主要参考：《基础肌动学》第3版，第${pages}页${review.coverage==='group'?'（肌群或相关说明；细分附着另作补充）':'。'}`};
}
