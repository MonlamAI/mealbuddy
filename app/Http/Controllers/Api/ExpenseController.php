<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MonthlyExpense;

class ExpenseController extends Controller
{
    public function store(Request $request)
    {
        return MonthlyExpense::create($request->all());
    }
}
