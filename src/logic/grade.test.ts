import { describe, expect, it } from 'vitest'
import { GRADE_TABLE, gradeChange, gradeForTotal, minTotalForGrade } from './grade'

describe('Notentabelle', () => {
  it('Beispiele aus der Schulpräsentation', () => {
    expect(gradeForTotal(589)).toBe('2,3')
    expect(gradeForTotal(664)).toBe('1,9')
    expect(gradeForTotal(509)).toBe('2,8')
    expect(gradeForTotal(300)).toBe('4,0')
  })

  it('deckt 300–900 lückenlos und ohne Überschneidung ab', () => {
    for (let total = 300; total <= 900; total++) {
      const matches = GRADE_TABLE.filter((b) => total >= b.min && total <= b.max)
      expect(matches, `Gesamtpunktzahl ${total}`).toHaveLength(1)
    }
    for (let i = 1; i < GRADE_TABLE.length; i++) {
      expect(GRADE_TABLE[i].max + 1).toBe(GRADE_TABLE[i - 1].min)
    }
  })

  it('Grenzwerte', () => {
    expect(gradeForTotal(900)).toBe('1,0')
    expect(gradeForTotal(823)).toBe('1,0')
    expect(gradeForTotal(822)).toBe('1,1')
    expect(gradeForTotal(643)).toBe('2,0')
    expect(gradeForTotal(642)).toBe('2,1')
    expect(gradeForTotal(301)).toBe('3,9')
    expect(gradeForTotal(299)).toBeNull()
    expect(gradeForTotal(901)).toBeNull()
  })

  it('nötige Gesamtpunkte für eine Zielnote', () => {
    expect(minTotalForGrade('1,0')).toBe(823)
    expect(minTotalForGrade('2,3')).toBe(589)
    expect(minTotalForGrade('4,0')).toBe(300)
    expect(minTotalForGrade('5,0')).toBeNull()
  })
})

describe('Kasten „Änderung der Durchschnittsnote“', () => {
  it('589 Punkte: 18 Punkte bis 2,2; schon 1 Punkt weniger ergibt 2,4', () => {
    const change = gradeChange(589)!
    expect(change.band.grade).toBe('2,3')
    expect(change.better).toEqual({ band: expect.objectContaining({ grade: '2,2' }), missing: 18 })
    expect(change.worse).toEqual({ band: expect.objectContaining({ grade: '2,4' }), threshold: 589, buffer: 0 })
  })

  it('606 Punkte: 1 Punkt bis 2,2, 17 Punkte Puffer', () => {
    const change = gradeChange(606)!
    expect(change.better?.missing).toBe(1)
    expect(change.worse.buffer).toBe(17)
  })

  it('1,0 hat keine bessere Note, 4,0 keine schlechtere', () => {
    expect(gradeChange(900)?.better).toBeNull()
    expect(gradeChange(300)?.worse.band).toBeNull()
    expect(gradeChange(250)).toBeNull()
  })
})
