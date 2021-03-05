import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { Exercise } from './exercise.model';

import { UIService } from '../shared/ui.service';
import { Subscription } from 'rxjs';

@Injectable()
export class TrainingService{
    exerciseChanged = new Subject<Exercise>();
    exercisesChanged = new Subject<Exercise[]>();
    finishedExercisesChanged = new Subject<Exercise[]>();

    private availableExercises: Exercise[]=[];
    private runningExercise: Exercise;
    private fbSubs: Subscription[] = [];

    constructor(private db: AngularFirestore,private uiService: UIService){}
  

    fetchAvailableExercises(){
        this.uiService.loadingStateChanged.next(true);
        this.fbSubs.push(this.db
        .collection('availableExercises')
        .snapshotChanges()
        .pipe(
            map(docArray=>{
                return docArray.map(doc=>{
                    return{
                        id:doc.payload.doc.id,
                        ...doc.payload.doc.data() as Exercise
                    };
                });
            })
        )
        .subscribe((exercises: Exercise[])=>{
            this.uiService.loadingStateChanged.next(false);
            this.availableExercises = exercises;
            this.exercisesChanged.next([...this.availableExercises]);
        }, error=>{
            this.uiService.loadingStateChanged.next(false);
            this.uiService.showSnackbar('Fething Exercises failed, please try again later', null, 4000);
            this.exercisesChanged.next(null);
        }));
    }

    startExercise(selectedId:string){
        this.runningExercise = this.availableExercises.find(ex=>ex.id === selectedId);
        this.exerciseChanged.next({...this.runningExercise});
    }

    getRunningExercise(){
        return{...this.runningExercise};
    }

    completeExercise(){
        this.addDataToDatabase({...this.runningExercise, date:new Date(), state:'completed'});
        this.runningExercise = null;
        this.exerciseChanged.next(null);
    }
    cancelExercise(progress:number){
        this.addDataToDatabase({
            ...this.runningExercise, 
            duration:this.runningExercise.duration*(progress/100),
            calories:this.runningExercise.calories*(progress/100),
            date:new Date(), 
            state:'cancelled'});
        this.runningExercise = null;
        this.exerciseChanged.next(null);
    }

    fetchCompletedOrCancelledExercises(){
        this.fbSubs.push(this.db.collection('finishedExercises').valueChanges().subscribe((exercises: Exercise[])=>{
            this.finishedExercisesChanged.next(exercises);
        }));
    }

    cancelSubscription(){
        this.fbSubs.forEach(sub => sub.unsubscribe());
    }

    private addDataToDatabase(exercise: Exercise){
        this.db.collection('finishedExercises').add(exercise);
    }
}